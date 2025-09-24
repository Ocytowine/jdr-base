import { getCatalogEntries } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogEntries('races');
  } catch (error) {
    console.error('[catalog/races] failed to load catalog', error);
    return [];
  }
});
