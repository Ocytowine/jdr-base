import { getCatalogEntries } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogEntries('backgrounds');
  } catch (error) {
    console.error('[catalog/backgrounds] failed to load catalog', error);
    return [];
  }
});
