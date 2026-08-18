#!/usr/bin/env node
/**
 * Minimal test runner — esbuild the TypeScript test entry to a temp ESM
 * bundle and execute it. No framework, no extra dependencies: esbuild is
 * already here for the runtime build.
 */
import * as esbuild from 'esbuild';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const dir = mkdtempSync(join(tmpdir(), 'mere-test-'));
const out = join(dir, 'unit.mjs');

try {
  await esbuild.build({
    entryPoints: ['test/unit.test.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    outfile: out,
    logLevel: 'error',
  });
  execFileSync('node', [out], { stdio: 'inherit' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
