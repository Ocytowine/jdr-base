import { getCatalogLabels } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogLabels('backgrounds');
  } catch (error) {
    console.error('[catalog/backgrounds] failed to load catalog', error);
    return [];
  }
});
