import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
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

type FetchStubOverride =
  | any
  | Error
  | (() => any)
  | (() => Promise<any>);

type FetchStubOptions = {
  catalog?: Partial<Record<string, FetchStubOverride>>;
  preview?: FetchStubOverride;
};

const createFetchStub = (
  log: Array<{ url: string; options?: any }>,
  options: FetchStubOptions = {}
): FetchHandler => {
  const catalogResponses: Record<string, FetchStubOverride> = {
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
    ],
    ...(options.catalog ?? {})
  };

  const previewResponse: FetchStubOverride = options.preview ?? {
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
      const response = catalogResponses[url];
      if (typeof response === 'function') {
        return await response();
      }
      if (response instanceof Error) {
        throw response;
      }
      return response;
    }
    if (url === '/api/creation/preview') {
      if (typeof previewResponse === 'function') {
        return await previewResponse();
      }
      if (previewResponse instanceof Error) {
        throw previewResponse;
      }
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
    niveau: 3,
    characterName: 'Archimage',
    characterFirstName: 'Aldara',
    characterLastName: 'Sombrelune',
    characterNickname: 'La Ruse',
    baseStats: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8
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
    assert.equal(
      unwrap(store.characterFirstName),
      savedState.characterFirstName,
      'first name should be restored'
    );
    assert.equal(
      unwrap(store.characterLastName),
      savedState.characterLastName,
      'last name should be restored'
    );
    assert.equal(
      unwrap(store.characterNickname),
      savedState.characterNickname,
      'nickname should be restored'
    );
    assert.deepEqual(
      serializeReactive(store.baseStats),
      savedState.baseStats,
      'base stats should be restored'
    );
    assert.equal(unwrap(store.pointBuyRemaining), 0, 'point buy should be balanced after restore');
    assert.equal(unwrap(store.isPointBuyBalanced), true, 'point buy budget should be balanced after restore');
    store.niveau = 99;
    await nextTick();
    assert.equal(unwrap(store.niveau), 3, 'niveau should clamp to maximum level');
    store.niveau = 0;
    await nextTick();
    assert.equal(unwrap(store.niveau), 1, 'niveau should clamp to minimum level');
    store.niveau = savedState.niveau;
    await nextTick();
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

    const persistedState = JSON.parse(
      (globalThis as any).localStorage.getItem('bonome_creation_state') ?? '{}'
    );

    assert.equal(
      persistedState.characterFirstName,
      savedState.characterFirstName,
      'persisted state should store first name'
    );
    assert.equal(
      persistedState.characterLastName,
      savedState.characterLastName,
      'persisted state should store last name'
    );
    assert.equal(
      persistedState.characterNickname,
      savedState.characterNickname,
      'persisted state should store nickname'
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
      persistedState.characterName ?? savedState.characterName,
      'reloaded store should keep character name'
    );
    assert.equal(
      unwrap(reloadedStore.characterFirstName),
      savedState.characterFirstName,
      'reloaded store should keep first name'
    );
    assert.equal(
      unwrap(reloadedStore.characterLastName),
      savedState.characterLastName,
      'reloaded store should keep last name'
    );
    assert.equal(
      unwrap(reloadedStore.characterNickname),
      savedState.characterNickname,
      'reloaded store should keep nickname'
    );
    assert.equal(unwrap(reloadedStore.pointBuyRemaining), 0, 'reloaded store should keep balanced point buy');
    assert.equal(unwrap(reloadedStore.isPointBuyBalanced), true, 'reloaded store should report balanced point buy');
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
    assert.deepEqual(
      unwrap(reloadedStore.classes).map((entry) => entry.id),
      ['wizard', 'ranger'],
      'reloaded store should use API-provided classes'
    );
    assert.deepEqual(
      unwrap(reloadedStore.races).map((entry) => entry.id),
      ['elf', 'human'],
      'reloaded store should use API-provided races'
    );
    assert.deepEqual(
      unwrap(reloadedStore.backgrounds).map((entry) => entry.id),
      ['sage'],
      'reloaded store should use API-provided backgrounds'
    );

    const previewCall = fetchLog.find((call) => call.url === '/api/creation/preview');
    assert.ok(previewCall, 'preview call should be logged after reload');
    assert.equal(
      previewCall?.options?.body?.baseCharacter?.first_name,
      savedState.characterFirstName,
      'preview should include first name'
    );
    assert.equal(
      previewCall?.options?.body?.baseCharacter?.last_name,
      savedState.characterLastName,
      'preview should include last name'
    );
    assert.equal(
      previewCall?.options?.body?.baseCharacter?.nickname,
      savedState.characterNickname,
      'preview should include nickname'
    );
    assert.equal(
      previewCall?.options?.body?.baseCharacter?.name,
      'Aldara Sombrelune « La Ruse »',
      'preview should include combined full name'
    );

    fetchLog.length = 0;
    __setNuxtAppStub({
      $fetch: createFetchStub(fetchLog, {
        catalog: {
          '/api/catalog/classes': [],
          '/api/catalog/races': [],
          '/api/catalog/backgrounds': []
        }
      })
    });
    (process as any).client = false;
    (globalThis as any).localStorage = createLocalStorageMock();
    setActivePinia(createPinia());
    const emptyCatalogStore = useBonomeCreationStore();

    await emptyCatalogStore.initialize();

    assert.deepEqual(
      unwrap(emptyCatalogStore.classes),
      [],
      'store should keep classes empty when API returns no data'
    );
    assert.deepEqual(
      unwrap(emptyCatalogStore.races),
      [],
      'store should keep races empty when API returns no data'
    );
    assert.deepEqual(
      unwrap(emptyCatalogStore.backgrounds),
      [],
      'store should keep backgrounds empty when API returns no data'
    );
    assert.equal(
      unwrap(emptyCatalogStore.selectedClass),
      '',
      'class selection should reset when no options are available'
    );
    assert.equal(
      unwrap(emptyCatalogStore.selectedRace),
      '',
      'race selection should reset when no options are available'
    );
    assert.equal(
      unwrap(emptyCatalogStore.selectedBackground),
      '',
      'background selection should reset when no options are available'
    );
    assert.equal(
      fetchLog.filter((call) => call.url.startsWith('/api/catalog/')).length,
      3,
      'empty catalog initialization should still call each catalog endpoint once'
    );
    assert.equal(
      fetchLog.filter((call) => call.url === '/api/creation/preview').length,
      1,
      'empty catalog initialization should still trigger a preview request'
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
