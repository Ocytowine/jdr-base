import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { isRef } from 'vue';

import { useBonomeCreationStore } from '../stores/bonomeCreation';
import { __setNuxtAppStub, FetchHandler } from '#app';

type LocalStorageShape = Record<string, string>;

type StorageLike = {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

const createLocalStorageMock = (initial: LocalStorageShape = {}): StorageLike => {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
};

const unwrap = <T>(maybeRef: T | { value: T }): T => {
  if (isRef(maybeRef)) {
    return (maybeRef as any).value as T;
  }
  if (maybeRef && typeof maybeRef === 'object' && 'value' in (maybeRef as any)) {
    return (maybeRef as any).value as T;
  }
  return maybeRef as T;
};

const serializeReactive = (value: any) => JSON.parse(JSON.stringify(value));

const createFetchStub = (log: Array<{ url: string; options?: any }>): FetchHandler => {
  const catalogResponses: Record<string, any> = {
    '/api/catalog/classes': [
      { id: 'wizard', name: 'Mage' },
      { id: 'ranger', name: 'Rôdeur' }
    ],
    '/api/catalog/races': [
      { id: 'elf', name: 'Elfe' },
      { id: 'human', name: 'Humain' }
    ],
    '/api/catalog/backgrounds': [
      { id: 'sage', name: 'Sage' }
    ]
  };

  const previewResponse = {
    ok: true,
    pendingChoices: [],
    previewCharacter: {
      final_stats: {
        strength: 10
      }
    }
  };

  return async (url: string, options?: any) => {
    log.push({ url, options });
    if (url in catalogResponses) {
      return catalogResponses[url];
    }
    if (url === '/api/creation/preview') {
      return previewResponse;
    }
    throw new Error(`Unhandled fetch to ${url}`);
  };
};

export async function run() {
  const fetchLog: Array<{ url: string; options?: any }> = [];
  __setNuxtAppStub({ $fetch: createFetchStub(fetchLog) });

  const originalProcessClient = (process as any).client;
  const originalLocalStorage = (globalThis as any).localStorage;

  const savedState = {
    selectedClass: 'wizard',
    selectedRace: 'elf',
    selectedBackground: 'sage',
    niveau: 7,
    characterName: 'Archimage',
    baseStats: {
      strength: 12,
      dexterity: 13,
      constitution: 14,
      intelligence: 18,
      wisdom: 15,
      charisma: 11
    },
    chosenOptions: {
      wizard_spell_choice: ['spell_magic_missile']
    }
  };

  try {
    setActivePinia(createPinia());
    const store = useBonomeCreationStore();

    (process as any).client = false;

    await store.initialize();

    const catalogCallsOnServer = fetchLog.filter((call) => call.url.startsWith('/api/catalog/')).length;
    const previewCallsOnServer = fetchLog.filter((call) => call.url === '/api/creation/preview').length;
    assert.equal(catalogCallsOnServer, 3, 'server initialize should load catalog once');
    assert.equal(previewCallsOnServer, 1, 'server initialize should send preview once');

    (globalThis as any).localStorage = createLocalStorageMock({
      bonome_creation_state: JSON.stringify(savedState)
    });

    fetchLog.length = 0;
    (process as any).client = true;

    await store.initialize();

    assert.equal(fetchLog.length, 0, 'client hydration should not refetch catalog or preview');
    assert.equal(unwrap(store.selectedClass), savedState.selectedClass, 'class should be restored');
    assert.equal(unwrap(store.selectedRace), savedState.selectedRace, 'race should be restored');
    assert.equal(unwrap(store.selectedBackground), savedState.selectedBackground, 'background should be restored');
    assert.equal(unwrap(store.niveau), savedState.niveau, 'niveau should be restored');
    assert.equal(unwrap(store.characterName), savedState.characterName, 'character name should be restored');
    assert.deepEqual(
      serializeReactive(store.baseStats),
      savedState.baseStats,
      'base stats should be restored'
    );
    assert.deepEqual(
      serializeReactive(store.chosenOptions),
      savedState.chosenOptions,
      'chosen options should be restored'
    );
    assert.deepEqual(
      serializeReactive(store.localChosen),
      savedState.chosenOptions,
      'local chosen options should mirror restored choices'
    );

    fetchLog.length = 0;
    setActivePinia(createPinia());
    const reloadedStore = useBonomeCreationStore();

    await reloadedStore.initialize();

    const catalogCallsOnReload = fetchLog.filter((call) => call.url.startsWith('/api/catalog/')).length;
    const previewCallsOnReload = fetchLog.filter((call) => call.url === '/api/creation/preview').length;
    assert.equal(catalogCallsOnReload, 3, 'reload should fetch catalog once');
    assert.equal(previewCallsOnReload, 1, 'reload should request preview once');

    assert.equal(
      unwrap(reloadedStore.selectedClass),
      savedState.selectedClass,
      'reloaded store should keep class selection'
    );
    assert.equal(
      unwrap(reloadedStore.selectedRace),
      savedState.selectedRace,
      'reloaded store should keep race selection'
    );
    assert.equal(
      unwrap(reloadedStore.selectedBackground),
      savedState.selectedBackground,
      'reloaded store should keep background selection'
    );
    assert.equal(
      unwrap(reloadedStore.characterName),
      savedState.characterName,
      'reloaded store should keep character name'
    );
    assert.deepEqual(
      serializeReactive(reloadedStore.chosenOptions),
      savedState.chosenOptions,
      'reloaded store should restore chosen options'
    );
    assert.ok(
      unwrap(reloadedStore.classes).length > 0 &&
        unwrap(reloadedStore.races).length > 0 &&
        unwrap(reloadedStore.backgrounds).length > 0,
      'reloaded store should populate catalog entries'
    );
  } finally {
    if (originalProcessClient === undefined) {
      delete (process as any).client;
    } else {
      (process as any).client = originalProcessClient;
    }
    if (originalLocalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalLocalStorage;
    }
    __setNuxtAppStub({
      async $fetch(url: string) {
        throw new Error(`No fetch handler configured for ${url}`);
      }
    });
  }
}
