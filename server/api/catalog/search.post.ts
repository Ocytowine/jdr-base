import { readBody } from 'h3'
import { getCatalogAdapter } from '~/server/utils/catalogAdapter'

type SearchFilters = Record<string, unknown>

const normalizeKey = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s_-]+/g, '')
    .toLowerCase()

const SEGMENT_ALIAS_MAP: Record<string, string[]> = {
  classid: ['classeid'],
  classeid: ['classid'],
  subclassid: ['sousclasseid'],
  sousclasseid: ['subclassid'],
  raceid: ['ligneeid'],
  ligneeid: ['raceid'],
  backgroundid: ['historiqueid'],
  historiqueid: ['backgroundid']
}

const getNested = (source: any, path: string): any => {
  const segments = String(path || '').split('.')

  const dive = (current: any, index: number): any => {
    if (index >= segments.length) {
      return current
    }
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }

    const segment = segments[index]
    const normalizedSegment = normalizeKey(segment)
    const aliases = new Set<string>([normalizedSegment, ...(SEGMENT_ALIAS_MAP[normalizedSegment] ?? [])])

    for (const key of Object.keys(current)) {
      const normalizedKey = normalizeKey(key)
      if (
        aliases.has(normalizedKey) ||
        (SEGMENT_ALIAS_MAP[normalizedKey] && SEGMENT_ALIAS_MAP[normalizedKey].includes(normalizedSegment))
      ) {
        const result = dive(current[key], index + 1)
        if (result !== undefined) {
          return result
        }
      }
    }

    return undefined
  }

  return dive(source, 0)
}

const matchesFilters = (record: Record<string, any>, filters: SearchFilters): boolean => {
  if (!filters || typeof filters !== 'object') return true
  for (const [key, value] of Object.entries(filters)) {
    const actual = getNested(record, key)
    if (Array.isArray(value)) {
      if (!value.includes(actual)) return false
    } else if (value !== actual) {
      return false
    }
  }
  return true
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      collection?: string
      filters?: SearchFilters
      refresh?: boolean
    }>(event)

    const collection = body?.collection
    if (!collection) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: 'collection is required' })
      )
    }

    const adapter: any = getCatalogAdapter()
    if (!adapter) {
      return sendError(
        event,
        createError({ statusCode: 500, statusMessage: 'catalog adapter unavailable' })
      )
    }

    const refresh = Boolean(body?.refresh)

    let entries: Array<{ id: string; payload: Record<string, any> }> = []

    try {
      const index = await adapter.fetchJsonFromRepoPath(`${collection}/index.json`, { refresh })
      if (Array.isArray(index)) {
        entries = await Promise.all(
          index
            .map((entry: any) => {
              const id =
                entry?.id ??
                entry?.slug ??
                entry?.key ??
                entry?.value ??
                entry?.name ??
                entry?.nom ??
                null
              if (!id) return null
              return adapter
                .fetchJsonFromRepoPath(`${collection}/${id}.json`, { refresh })
                .then((payload: any) =>
                  payload && typeof payload === 'object'
                    ? { id: String(id), payload: payload as Record<string, any> }
                    : null
                )
                .catch(() => null)
            })
            .filter(Boolean)
        ).then((results) => results.filter(Boolean) as Array<{ id: string; payload: Record<string, any> }>)
      }
    } catch {
      // ignore index errors
    }

    if (!entries.length) {
      const files = await adapter.listFilesInPath(collection)
      entries = await Promise.all(
        (files || [])
          .map((file: any) => {
            const name =
              file?.id ?? file?.name ?? file?.slug ?? file?.value ?? file?.path ?? null
            if (!name) return null
            const normalized = String(name).replace(/\.json$/i, '').split('/').pop()
            if (!normalized) return null
            return adapter
              .fetchJsonFromRepoPath(`${collection}/${normalized}.json`, { refresh })
              .then((payload: any) =>
                payload && typeof payload === 'object'
                  ? { id: normalized, payload: payload as Record<string, any> }
                  : null
              )
              .catch(() => null)
          })
          .filter(Boolean)
      ).then((results) => results.filter(Boolean) as Array<{ id: string; payload: Record<string, any> }>)
    }

    const filtered = entries.filter((entry) =>
      matchesFilters(entry.payload, body?.filters ?? {})
    )

    return filtered.map(({ id, payload }) => ({
      id,
      payload
    }))
  } catch (error) {
    console.error('[catalog] search failed', error)
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: 'catalog search failed' })
    )
  }
})
