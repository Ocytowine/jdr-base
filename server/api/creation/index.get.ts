import { getCatalogEntries } from '../catalog/_utils';

export default defineEventHandler(async () => {
  try {
    const [classes, races, backgrounds] = await Promise.all([
      getCatalogEntries('classes'),
      getCatalogEntries('races'),
      getCatalogEntries('backgrounds')
    ]);

    return {
      ok: true,
      classes,
      races,
      backgrounds,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[creation/index] failed to build catalog index', error);
    return {
      ok: false,
      classes: [],
      races: [],
      backgrounds: [],
      error: error instanceof Error ? error.message : String(error ?? 'unknown error')
    };
  }
});
