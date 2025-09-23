import assert from 'node:assert/strict';

import { setCatalogAdapter } from '../server/utils/catalogAdapter';

class SuccessAdapter {
  async fetchJsonFromRepoPath(repoPath: string) {
    if (repoPath === 'classes/index.json') {
      return ['Guerrier', { name: 'Mage' }, { id: 'roublard' }, 42, null];
    }
    if (repoPath === 'races/index.json') {
      return [{ name: 'Humain' }, { id: 'elfe' }, 'nain'];
    }
    throw new Error(`unexpected path: ${repoPath}`);
  }

  async listFilesInPath() {
    throw new Error('listFilesInPath should not be called in success scenario');
  }
}

class FallbackAdapter {
  async fetchJsonFromRepoPath() {
    throw new Error('index not available');
  }

  async listFilesInPath(kind: string) {
    if (kind === 'races') {
      return [
        { type: 'file', name: 'elfe.json' },
        { type: 'dir', name: 'subfolder' },
        { type: 'file', path: 'races/nain.json' }
      ];
    }
    if (kind === 'classes') {
      return [
        { type: 'file', name: 'barbare.json' },
        { type: 'file', name: 'barde.JSON' },
        { type: 'file', path: 'classes/ensorceleur.json' }
      ];
    }
    return [];
  }
}

class ErroringAdapter {
  async fetchJsonFromRepoPath() {
    throw new Error('cannot fetch index');
  }

  async listFilesInPath() {
    throw new Error('cannot list files');
  }
}

export async function run() {
  const originalDefine = (globalThis as any).defineEventHandler;
  const originalConfig = (globalThis as any).useRuntimeConfig;

  (globalThis as any).defineEventHandler = (handler: any) => handler;
  (globalThis as any).useRuntimeConfig = () => ({ github: {}, dataCacheDir: '/tmp/test-cache' });

  const classesModule = await import('../server/api/catalog/classes.get');
  const racesModule = await import('../server/api/catalog/races.get');
  const classesHandler = classesModule.default;
  const racesHandler = racesModule.default;

  setCatalogAdapter(new SuccessAdapter());
  const classesFromIndex = await classesHandler({} as any);
  const racesFromIndex = await racesHandler({} as any);

  assert.deepEqual(classesFromIndex, ['Guerrier', 'Mage', 'roublard', '42']);
  assert.deepEqual(racesFromIndex, ['Humain', 'elfe', 'nain']);

  setCatalogAdapter(new FallbackAdapter());
  const classesFallback = await classesHandler({} as any);
  const racesFallback = await racesHandler({} as any);

  assert.deepEqual(classesFallback, ['barbare', 'barde', 'ensorceleur']);
  assert.deepEqual(racesFallback, ['elfe', 'nain']);

  const originalError = console.error;
  let loggedErrors = 0;
  console.error = (...args: any[]) => {
    loggedErrors += 1;
    return originalError.apply(console, args as any);
  };

  setCatalogAdapter(new ErroringAdapter());
  const classesError = await classesHandler({} as any);
  const racesError = await racesHandler({} as any);

  assert.deepEqual(classesError, []);
  assert.deepEqual(racesError, []);
  assert.ok(loggedErrors >= 2, 'errors should be logged for each catalog handler');

  console.error = originalError;
  setCatalogAdapter(null);

  if (originalDefine) {
    (globalThis as any).defineEventHandler = originalDefine;
  } else {
    delete (globalThis as any).defineEventHandler;
  }

  if (originalConfig) {
    (globalThis as any).useRuntimeConfig = originalConfig;
  } else {
    delete (globalThis as any).useRuntimeConfig;
  }
}
