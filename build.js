import * as esbuild from 'esbuild';
import { readFileSync, createReadStream, existsSync } from 'fs';
import { createServer } from 'http';
import { extname, join } from 'path';

const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');

// Inline CSS theme files as JS strings
const inlineCssPlugin = {
  name: 'inline-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, (args) => {
      const css = readFileSync(args.path, 'utf8');
      return {
        contents: `export default ${JSON.stringify(css)}`,
        loader: 'js',
      };
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ['src/runtime/index.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'Mere',
  outfile: 'dist/mere-runtime.js',
  sourcemap: true,
  minify: false,
  plugins: [inlineCssPlugin],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

if (serve) {
  // esbuild handles JS/sourcemap; our proxy handles .mp → text/html MIME
  const { host, port: esbuildPort } = await ctx.serve({ servedir: '.', port: 3457 });

  const MIME = {
    '.mp':   'text/html; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.map':  'application/json',
    '.css':  'text/css',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
  };

  const proxy = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const ext = extname(url.pathname);

    // Serve .mp files directly from disk with correct MIME type
    if (ext === '.mp') {
      const filePath = join('.', url.pathname);
      if (existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        createReadStream(filePath).pipe(res);
        return;
      }
    }

    // Forward everything else to esbuild's server
    const options = {
      hostname: host,
      port: esbuildPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    import('http').then(({ request }) => {
      const proxyReq = request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res);
      });
      req.pipe(proxyReq);
    });
  });

  proxy.listen(3456, () => {
    console.log('Mere dev server running at http://localhost:3456');
    console.log('Open examples/inbox.mp via http://localhost:3456/examples/inbox.mp');
  });
} else if (watch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  // Build runtime (unminified — for dev/CDN)
  await ctx.rebuild();
  await ctx.dispose();
  console.log('Built dist/mere-runtime.js');

  // Build minified runtime — for mere pack
  await esbuild.build({
    entryPoints: ['src/runtime/index.ts'],
    bundle: true,
    format: 'iife',
    globalName: 'Mere',
    outfile: 'dist/mere-runtime.min.js',
    sourcemap: false,
    minify: true,
    plugins: [inlineCssPlugin],
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  console.log('Built dist/mere-runtime.min.js');

  // Build CLI
  await esbuild.build({
    entryPoints: ['src/cli/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    outfile: 'dist/mere-cli.js',
    // shebang is already in src/cli/index.ts
    external: ['node-html-parser'], // keep as external dep, not inlined
    sourcemap: false,
    minify: false,
  });
  console.log('Built dist/mere-cli.js');
}
