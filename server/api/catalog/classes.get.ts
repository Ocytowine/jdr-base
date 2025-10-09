import { getCatalogEntries } from './_utils';

export default defineEventHandler(async (event) => {
  try {
    const q = getQuery(event) as Record<string, any>;
    const refresh = String(q.refresh ?? '').toLowerCase();
    const force = refresh === '1' || refresh === 'true' || refresh === 'yes';
    return await getCatalogEntries('classes', force);
  } catch (error) {
    console.error('[catalog/classes] failed to load catalog', error);
    return [];
  }
});
