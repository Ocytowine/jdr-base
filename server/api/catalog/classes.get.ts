import { getCatalogEntries } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogEntries('classes');
  } catch (error) {
    console.error('[catalog/classes] failed to load catalog', error);
    return [];
  }
});
