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
    if (repoPath === 'backgrounds/index.json') {
      return [
        { id: 'acolyte', description: 'Serviteur dévoué', image: 'acolyte.png' },
        { slug: 'artisan', summary: 'Maître des outils' },
        'soldat'
      ];
    }
    if (repoPath === 'backgrounds/acolyte.json') {
      return { name: 'Acolyte', description: 'Foi inébranlable', image: 'acolyte.png' };
    }
    if (repoPath === 'backgrounds/artisan.json') {
      return { name: 'Artisan', flavor: 'Créateur talentueux' };
    }
    if (repoPath === 'backgrounds/soldat.json') {
      return { name: 'Soldat', desc: 'Discipliné' };
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
    if (kind === 'backgrounds') {
      return [
        { type: 'file', name: 'acolyte.json' },
        { type: 'file', path: 'backgrounds/artisan.json' },
        { type: 'file', name: 'soldat.json' }
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
  const backgroundsModule = await import('../server/api/catalog/backgrounds.get');
  const classesHandler = classesModule.default;
  const racesHandler = racesModule.default;
  const backgroundsHandler = backgroundsModule.default;

  setCatalogAdapter(new SuccessAdapter());
  const classesFromIndex = await classesHandler({} as any);
  const racesFromIndex = await racesHandler({} as any);
  const backgroundsFromIndex = await backgroundsHandler({} as any);

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
  assert.deepEqual(backgroundsFromIndex, [
    { id: 'acolyte', name: 'Acolyte', description: 'Foi inébranlable', image: 'acolyte.png' },
    { id: 'artisan', name: 'Artisan', description: 'Créateur talentueux', image: undefined },
    { id: 'soldat', name: 'Soldat', description: 'Discipliné', image: undefined }
  ]);

  setCatalogAdapter(new FallbackAdapter());
  const classesFallback = await classesHandler({} as any);
  const racesFallback = await racesHandler({} as any);
  const backgroundsFallback = await backgroundsHandler({} as any);

  assert.deepEqual(classesFallback, [
    { id: 'barbare', name: 'Barbare', description: 'barbare details', image: undefined },
    { id: 'barde', name: 'Barde', description: 'barde details', image: undefined },
    { id: 'ensorceleur', name: 'Ensorceleur', description: 'ensorceleur details', image: undefined }
  ]);
  assert.deepEqual(racesFallback, [
    { id: 'elfe', name: 'Elfe', description: 'elfe details', image: undefined },
    { id: 'nain', name: 'Nain', description: 'nain details', image: undefined }
  ]);
  assert.deepEqual(backgroundsFallback, [
    { id: 'acolyte', name: 'Acolyte', description: 'acolyte details', image: undefined },
    { id: 'artisan', name: 'Artisan', description: 'artisan details', image: undefined },
    { id: 'soldat', name: 'Soldat', description: 'soldat details', image: undefined }
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
  const backgroundsError = await backgroundsHandler({} as any);

  assert.deepEqual(classesError, []);
  assert.deepEqual(racesError, []);
  assert.deepEqual(backgroundsError, []);
  assert.ok(loggedErrors >= 3, 'errors should be logged for each catalog handler');

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
