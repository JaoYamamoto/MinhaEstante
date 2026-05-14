/**
 * Cliente para a API Google Books — chama a Route Handler interna
 * `/api/books-search` (que faz o fetch real com cache e retry no servidor).
 */

export interface GoogleBook {
  id: string
  title: string
  authors: string[]
  publisher: string
  publishedDate: string
  description: string
  pageCount: number
  categories: string[]
  language: string
  coverUrl: string | null
  averageRating: number
  ratingsCount: number
}

interface GBVolumeInfo {
  title?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string
  description?: string
  pageCount?: number
  categories?: string[]
  language?: string
  averageRating?: number
  ratingsCount?: number
  imageLinks?: { thumbnail?: string; smallThumbnail?: string }
}

interface GBItem { id: string; volumeInfo: GBVolumeInfo }

function coverOf(info: GBVolumeInfo): string | null {
  const raw = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
  return raw ? raw.replace(/^http:/, 'https:').replace(/&zoom=\d/, '&zoom=1') : null
}

function toGoogleBook(item: GBItem): GoogleBook {
  const v = item.volumeInfo
  return {
    id:            item.id,
    title:         v.title         ?? 'Sem título',
    authors:       v.authors       ?? [],
    publisher:     v.publisher     ?? '',
    publishedDate: v.publishedDate ?? '',
    description:   v.description   ?? '',
    pageCount:     v.pageCount     ?? 0,
    categories:    v.categories    ?? [],
    language:      v.language      ?? '',
    coverUrl:      coverOf(v),
    averageRating: v.averageRating ?? 0,
    ratingsCount:  v.ratingsCount  ?? 0,
  }
}

function relevanceScore(b: GoogleBook): number {
  return b.averageRating * Math.log10(b.ratingsCount + 1)
}

// ── Cache em memória no cliente (evita bater na route repetidamente) ───────
const _cache = new Map<string, { result: GoogleBook[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export async function searchGoogleBooks(query: string, display = 12): Promise<GoogleBook[]> {
  if (!query.trim()) return []

  if (!navigator.onLine) throw new Error('NETWORK')

  const cacheKey = `${query.trim().toLowerCase()}|${display}`
  const cached   = _cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result

  const url = new URL('/api/books-search', window.location.origin)
  url.searchParams.set('q', query)
  url.searchParams.set('maxResults', '30')

  const controller = new AbortController()
  const clientTimer = setTimeout(() => controller.abort(), 12_000)
  let res: Response
  try {
    res = await fetch(url.toString(), { signal: controller.signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('TIMEOUT')
    throw new Error('NETWORK')
  } finally {
    clearTimeout(clientTimer)
  }
  const data = await res.json()

  // A route agora devolve { error: 'RATE_LIMIT' | 'TIMEOUT' | 'NETWORK' }
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `HTTP_${res.status}`)
  }

  const books: GoogleBook[] = (data.items ?? []).map(toGoogleBook)
  books.sort((a, b) => relevanceScore(b) - relevanceScore(a))
  const result = books.slice(0, display)

  _cache.set(cacheKey, { result, ts: Date.now() })
  return result
}
