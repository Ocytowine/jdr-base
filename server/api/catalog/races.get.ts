import { getCatalogLabels } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogLabels('races');
  } catch (error) {
    console.error('[catalog/races] failed to load catalog', error);
    return [];
  }
});
