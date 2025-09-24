import { getCatalogEntries } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogEntries('spells');
  } catch (error) {
    console.error('[catalog/classes] failed to load catalog', error);
    return [];
  }
});
