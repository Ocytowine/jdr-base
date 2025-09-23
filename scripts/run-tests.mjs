import { build } from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

const projectRoot = path.resolve('.');
const testDir = path.join(projectRoot, 'tests');
const outDir = path.join(projectRoot, '.tmp-tests');

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const testFiles = (await fs.readdir(testDir))
  .filter((file) => file.endsWith('.test.ts'))
  .sort();

let exitCode = 0;

for (const file of testFiles) {
  const entryPath = path.join(testDir, file);
  const outFile = path.join(outDir, `${file.replace(/\.ts$/, '.mjs')}`);

  await build({
    entryPoints: [entryPath],
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
  } else {
    console.error(`No run() export found in compiled test ${file}`);
    exitCode = 1;
  }
}

await fs.rm(outDir, { recursive: true, force: true });

if (exitCode) {
  process.exitCode = exitCode;
}
