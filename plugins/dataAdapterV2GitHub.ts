import { DataAdapterV2GitHub } from '@/utils/dataAdapterV2GitHub'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const adapter = new DataAdapterV2GitHub(
    config.github?.owner || process.env.GITHUB_OWNER || 'Ocytowine',
    config.github?.repo || process.env.GITHUB_REPO || 'ArchiveValmorinTest',
    {
      branch: config.github?.branch || process.env.GITHUB_BRANCH || 'main',
      token: config.github?.token || process.env.GITHUB_TOKEN || '',
      cacheDir: config.dataCacheDir || process.env.DATA_CACHE_DIR || '/tmp/data_adapter_cache'
    }
  )
  nuxtApp.provide('dataAdapterV2GitHub', adapter)
})
