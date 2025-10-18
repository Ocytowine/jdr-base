import { getCatalogAdapter } from '~/server/utils/catalogAdapter'

export default defineEventHandler(async (event) => {
  try {
    const params = event?.context?.params as Record<string, string> | undefined
    const collection = params?.collection
    const id = params?.id
    if (!collection || !id) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          statusMessage: 'collection and id are required'
        })
      )
    }

    const adapter: any = getCatalogAdapter()
    if (!adapter) {
      return sendError(
        event,
        createError({
          statusCode: 500,
          statusMessage: 'catalog adapter unavailable'
        })
      )
    }

    const refreshParam = getQuery(event)?.refresh
    const refresh =
      typeof refreshParam === 'string'
        ? ['1', 'true', 'yes'].includes(refreshParam.toLowerCase())
        : false

    const repoPath = `${collection}/${id}.json`
    const payload = await adapter.fetchJsonFromRepoPath(repoPath, { refresh })
    if (!payload || typeof payload !== 'object') {
      return sendError(
        event,
        createError({
          statusCode: 404,
          statusMessage: `catalog entry ${collection}/${id} not found`
        })
      )
    }
    return payload
  } catch (error) {
    console.error('[catalog] entry fetch failed', error)
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: 'catalog entry fetch failed'
      })
    )
  }
})
