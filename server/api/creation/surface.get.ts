import { useCreationAdapter } from '~/server/utils/creationAdapter';

export default defineEventHandler(async () => {
  const { service } = await useCreationAdapter();
  const surface = await service.getCreationSurface();
  return { ok: true, surface };
});
