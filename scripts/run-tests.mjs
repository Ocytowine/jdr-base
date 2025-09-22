import { build } from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

const projectRoot = path.resolve('.');
const outDir = path.join(projectRoot, '.tmp-tests');
const outFile = path.join(outDir, 'creationAdapter.test.mjs');

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, 'tests/creationAdapter.test.ts')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: 'inline',
  logLevel: 'silent',
  alias: {
    '~': projectRoot,
    '@': projectRoot
  }
});

const mod = await import(pathToFileURL(outFile).href);

if (typeof mod.run === 'function') {
  await mod.run();
  await fs.rm(outDir, { recursive: true, force: true });
} else {
  console.error('No run() export found in compiled tests');
  process.exitCode = 1;
}
