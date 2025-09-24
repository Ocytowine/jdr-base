import assert from 'node:assert/strict';

import { setCatalogAdapter } from '../server/utils/catalogAdapter';

class SuccessAdapter {
  async fetchJsonFromRepoPath(repoPath: string) {
    if (repoPath === 'classes/index.json') {
      return [
        { id: 'wizard', label: 'Wizard', description: 'Maître des arcanes', image: 'https://cdn.test/wizard.png' },
        { slug: 'fighter', desc: 'Guerrier polyvalent' },
        'rogue'
      ];
    }
    if (repoPath === 'classes/wizard.json') {
      return {
        id: 'wizard',
        name: 'Wizard',
        description: 'Maître des arcanes',
        image: 'https://cdn.test/wizard.png',
        effect_label: 'Réaction : +5 CA jusqu\'au prochain tour.'
      };
    }
    if (repoPath === 'classes/fighter.json') {
      return {
        id: 'fighter',
        name: 'Fighter',
        description: 'Guerrier polyvalent',
        effectLabel: 'Action bonus : Second souffle'
      };
    }
    if (repoPath === 'classes/rogue.json') {
      return { id: 'rogue', name: 'Rogue' };
    }
    if (repoPath === 'races/index.json') {
      return [
        { id: 'humain', name: 'Humain', description: 'Polyvalent' },
        { id: 'elfe', image: 'https://cdn.test/elfe.png' },
        'nain'
      ];
    }
    if (repoPath === 'races/humain.json') {
      return { id: 'humain', name: 'Humain', description: 'Polyvalent', effect_label: 'Polyvalence humaine' };
    }
    if (repoPath === 'races/elfe.json') {
      return { id: 'elfe', name: 'Elfe', image: 'https://cdn.test/elfe.png' };
    }
    if (repoPath === 'races/nain.json') {
      return { id: 'nain', name: 'Nain' };
    }
    if (repoPath === 'backgrounds/index.json') {
      return [
        { key: 'acolyte', description: 'Serviteur du temple', image: 'https://cdn.test/acolyte.png' },
        { id: 'artisan', label: 'Artisan' }
      ];
    }
    if (repoPath === 'backgrounds/acolyte.json') {
      return {
        id: 'acolyte',
        name: 'Acolyte',
        description: 'Serviteur du temple',
        image: 'https://cdn.test/acolyte.png',
        effect_label: 'Compétences : Religion, Persuasion'
      };
    }
    if (repoPath === 'backgrounds/artisan.json') {
      return { id: 'artisan', name: 'Artisan' };
    }
    throw new Error(`unexpected path: ${repoPath}`);
  }

  async listFilesInPath(_kind: string) {
    throw new Error('listFilesInPath should not be called in success scenario');
  }
}

class FallbackAdapter {
  async fetchJsonFromRepoPath(_repoPath: string) {
    throw new Error('index not available');
  }

  async listFilesInPath(kind: string) {
    if (kind === 'classes') {
      return [
        { type: 'file', name: 'barbare.json' },
        { type: 'file', name: 'barde.JSON' },
        { type: 'file', path: 'classes/ensorceleur.json' }
      ];
    }
    if (kind === 'races') {
      return [
        { type: 'file', name: 'elfe.json' },
        { type: 'dir', name: 'subfolder' },
        { type: 'file', path: 'races/nain.json' }
      ];
    }
    if (kind === 'backgrounds') {
      return [
        { type: 'file', name: 'acolyte.json' },
        { type: 'file', path: 'backgrounds/soldat.json' }
      ];
    }
    return [];
  }
}

class ErroringAdapter {
  async fetchJsonFromRepoPath(_repoPath: string) {
    throw new Error('cannot fetch index');
  }

  async listFilesInPath(_kind: string) {
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
    {
      id: 'wizard',
      name: 'Wizard',
      description: 'Maître des arcanes',
      image: 'https://cdn.test/wizard.png',
      effectLabel: "Réaction : +5 CA jusqu'au prochain tour.",
      effect_label: "Réaction : +5 CA jusqu'au prochain tour."
    },
    {
      id: 'fighter',
      name: 'Fighter',
      description: 'Guerrier polyvalent',
      image: null,
      effectLabel: 'Action bonus : Second souffle',
      effect_label: 'Action bonus : Second souffle'
    },
    {
      id: 'rogue',
      name: 'Rogue',
      description: null,
      image: null,
      effectLabel: null,
      effect_label: null
    }
  ]);

  assert.deepEqual(racesFromIndex, [
    {
      id: 'humain',
      name: 'Humain',
      description: 'Polyvalent',
      image: null,
      effectLabel: 'Polyvalence humaine',
      effect_label: 'Polyvalence humaine'
    },
    {
      id: 'elfe',
      name: 'Elfe',
      description: null,
      image: 'https://cdn.test/elfe.png',
      effectLabel: null,
      effect_label: null
    },
    {
      id: 'nain',
      name: 'Nain',
      description: null,
      image: null,
      effectLabel: null,
      effect_label: null
    }
  ]);

  assert.deepEqual(backgroundsFromIndex, [
    {
      id: 'acolyte',
      name: 'Acolyte',
      description: 'Serviteur du temple',
      image: 'https://cdn.test/acolyte.png',
      effectLabel: 'Compétences : Religion, Persuasion',
      effect_label: 'Compétences : Religion, Persuasion'
    },
    {
      id: 'artisan',
      name: 'Artisan',
      description: null,
      image: null,
      effectLabel: null,
      effect_label: null
    }
  ]);

  setCatalogAdapter(new FallbackAdapter());
  const classesFallback = await classesHandler({} as any);
  const racesFallback = await racesHandler({} as any);
  const backgroundsFallback = await backgroundsHandler({} as any);

  assert.deepEqual(classesFallback, [
    { id: 'barbare', name: 'Barbare', description: null, image: null, effectLabel: null, effect_label: null },
    { id: 'barde', name: 'Barde', description: null, image: null, effectLabel: null, effect_label: null },
    { id: 'ensorceleur', name: 'Ensorceleur', description: null, image: null, effectLabel: null, effect_label: null }
  ]);
  assert.deepEqual(racesFallback, [
    { id: 'elfe', name: 'Elfe', description: null, image: null, effectLabel: null, effect_label: null },
    { id: 'nain', name: 'Nain', description: null, image: null, effectLabel: null, effect_label: null }
  ]);
  assert.deepEqual(backgroundsFallback, [
    { id: 'acolyte', name: 'Acolyte', description: null, image: null, effectLabel: null, effect_label: null },
    { id: 'soldat', name: 'Soldat', description: null, image: null, effectLabel: null, effect_label: null }
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
