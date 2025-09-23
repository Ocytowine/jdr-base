import { getCatalogLabels } from './_utils';

export default defineEventHandler(async () => {
  try {
    return await getCatalogLabels('classes');
  } catch (error) {
    console.error('[catalog/classes] failed to load catalog', error);
    return [];
  }
});
