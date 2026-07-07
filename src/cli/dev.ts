import { createReadStream, existsSync, readdirSync, readFileSync, statSync, watch } from 'fs';
import { createServer, type ServerResponse } from 'http';
import { extname, join, relative, resolve } from 'path';
import { spawn } from 'child_process';
import { checkFile } from './check.js';
import { formatDiagnostic } from './diagnostics.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const RELOAD_SCRIPT = `
<script>
  new EventSource('/__mere-dev-reload').onmessage = () => location.reload();
</script>
`;

function runCheck(dir: string, useColor: boolean) {
  const files = findWorkbooks(dir);
  let total = 0;
  for (const file of files) {
    const diags = checkFile(file);
    total += diags.length;
    for (const d of diags) console.log(formatDiagnostic(d, useColor));
  }
  if (files.length > 0) {
    console.log(total === 0 ? `✓ ${files.length} workbook(s) clean` : `${total} diagnostic(s)`);
  }
}

function findWorkbooks(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findWorkbooks(full));
    else if (entry.name.endsWith('.mp.html') || entry.name.endsWith('.mp')) out.push(full);
  }
  return out;
}

function openBrowser(url: string) {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open';
  try {
    spawn(cmd, [url], { shell: process.platform === 'win32', stdio: 'ignore', detached: true }).unref();
  } catch {
    // best-effort — not fatal if no GUI/browser available
  }
}

export function runDevCommand(args: string[]) {
  const positional = args.filter(a => !a.startsWith('--'));
  const portFlag = args.find(a => a.startsWith('--port='));
  const noOpen = args.includes('--no-open');

  const target = positional[0] ?? '.';
  const targetPath = resolve(target);
  const isFile = existsSync(targetPath) && statSync(targetPath).isFile();
  const rootDir = isFile ? resolve(targetPath, '..') : targetPath;
  const entryPath = isFile ? '/' + relative(rootDir, targetPath) : '/';

  if (!existsSync(rootDir)) {
    console.error(`No such directory: ${rootDir}`);
    process.exit(1);
  }

  const port = portFlag ? Number(portFlag.split('=')[1]) : 4321;
  const useColor = process.stdout.isTTY;
  const reloadClients: ServerResponse[] = [];

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/__mere-dev-reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('\n');
      reloadClients.push(res);
      req.on('close', () => {
        const i = reloadClients.indexOf(res);
        if (i !== -1) reloadClients.splice(i, 1);
      });
      return;
    }

    let pathname = url.pathname;
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = join(rootDir, pathname);

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = extname(filePath) === '.mp' ? '.html' : extname(filePath);
    const contentType = MIME[ext] ?? 'application/octet-stream';

    if (contentType.startsWith('text/html')) {
      const html = readFileSync(filePath, 'utf8');
      const injected = html.includes('</body>')
        ? html.replace('</body>', `${RELOAD_SCRIPT}</body>`)
        : html + RELOAD_SCRIPT;
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(injected);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
  });

  server.listen(port, () => {
    console.log(`\nMere dev server → http://localhost:${port}${entryPath}`);
    console.log(`Serving ${rootDir}\n`);
    runCheck(rootDir, useColor);

    if (!noOpen) openBrowser(`http://localhost:${port}${entryPath}`);

    try {
      watch(rootDir, { recursive: true }, (_event, filename) => {
        if (!filename || (!filename.endsWith('.mp.html') && !filename.endsWith('.mp'))) return;
        console.log(`\nchanged: ${filename}`);
        runCheck(rootDir, useColor);
        for (const client of reloadClients) client.write('data: reload\n\n');
      });
    } catch {
      console.log('(file watching unavailable on this platform — reload manually after edits)');
    }
  });
}
