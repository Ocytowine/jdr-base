import assert from 'node:assert/strict';

import { setCatalogAdapter } from '../server/utils/catalogAdapter';

class SuccessAdapter {
  async fetchJsonFromRepoPath(repoPath: string) {
    if (repoPath === 'classes/index.json') {
      return ['guerrier', { name: 'mage', description: 'Maître des arcanes' }, { id: 'roublard' }, 42, null];
    }
    if (repoPath === 'classes/guerrier.json') {
      return { name: 'Guerrier', description: 'Maître du combat', image: 'warrior.png' };
    }
    if (repoPath === 'classes/mage.json') {
      return { name: 'Mage', summary: 'Maîtrise de la magie' };
    }
    if (repoPath === 'classes/roublard.json') {
      return { name: 'Roublard', desc: 'Spécialiste des ombres', image: 'rogue.png' };
    }
    if (repoPath === 'classes/42.json') {
      return { name: 'Mystère' };
    }
    if (repoPath === 'races/index.json') {
      return [{ name: 'humain', description: 'Versatile' }, { id: 'elfe', image: 'elf.png' }, 'nain'];
    }
    if (repoPath === 'races/humain.json') {
      return { name: 'Humain', description: 'Adaptable' };
    }
    if (repoPath === 'races/elfe.json') {
      return { name: 'Elfe', flavor_text: 'Grâce et magie' };
    }
    if (repoPath === 'races/nain.json') {
      return { name: 'Nain', description: 'Robuste', image: 'dwarf.png' };
    }
    throw new Error(`unexpected path: ${repoPath}`);
  }

  async listFilesInPath() {
    throw new Error('listFilesInPath should not be called in success scenario');
  }
}

class FallbackAdapter {
  async fetchJsonFromRepoPath(repoPath: string) {
    if (/index\.json$/i.test(repoPath)) {
      throw new Error('index not available');
    }
    const slug = repoPath.replace(/\.json$/i, '').split('/').pop() ?? '';
    const pretty = slug.charAt(0).toUpperCase() + slug.slice(1);
    return { name: pretty, description: `${slug} details` };
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

  assert.deepEqual(classesFromIndex, [
    { id: 'guerrier', name: 'Guerrier', description: 'Maître du combat', image: 'warrior.png' },
    { id: 'mage', name: 'Mage', description: 'Maîtrise de la magie', image: undefined },
    { id: 'roublard', name: 'Roublard', description: 'Spécialiste des ombres', image: 'rogue.png' },
    { id: '42', name: 'Mystère', description: undefined, image: undefined }
  ]);
  assert.deepEqual(racesFromIndex, [
    { id: 'humain', name: 'Humain', description: 'Adaptable', image: undefined },
    { id: 'elfe', name: 'Elfe', description: 'Grâce et magie', image: 'elf.png' },
    { id: 'nain', name: 'Nain', description: 'Robuste', image: 'dwarf.png' }
  ]);

  setCatalogAdapter(new FallbackAdapter());
  const classesFallback = await classesHandler({} as any);
  const racesFallback = await racesHandler({} as any);

  assert.deepEqual(classesFallback, [
    { id: 'barbare', name: 'Barbare', description: 'barbare details', image: undefined },
    { id: 'barde', name: 'Barde', description: 'barde details', image: undefined },
    { id: 'ensorceleur', name: 'Ensorceleur', description: 'ensorceleur details', image: undefined }
  ]);
  assert.deepEqual(racesFallback, [
    { id: 'elfe', name: 'Elfe', description: 'elfe details', image: undefined },
    { id: 'nain', name: 'Nain', description: 'nain details', image: undefined }
  ]);

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
