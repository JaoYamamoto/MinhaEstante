/**
 * Cliente para a API Google Books (pública, sem necessidade de chave para buscas básicas).
 * Documentação: https://developers.google.com/books/docs/v1/using
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
  imageLinks?: {
    thumbnail?: string
    smallThumbnail?: string
  }
}

interface GBItem {
  id: string
  volumeInfo: GBVolumeInfo
}

function coverOf(info: GBVolumeInfo): string | null {
  const raw = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
  if (!raw) return null
  return raw.replace(/^http:/, "https:").replace(/&zoom=\d/, "&zoom=1")
}

function toGoogleBook(item: GBItem): GoogleBook {
  const v = item.volumeInfo
  return {
    id:            item.id,
    title:         v.title         ?? "Sem título",
    authors:       v.authors       ?? [],
    publisher:     v.publisher     ?? "",
    publishedDate: v.publishedDate ?? "",
    description:   v.description   ?? "",
    pageCount:     v.pageCount     ?? 0,
    categories:    v.categories    ?? [],
    language:      v.language      ?? "",
    coverUrl:      coverOf(v),
    averageRating: v.averageRating ?? 0,
    ratingsCount:  v.ratingsCount  ?? 0,
  }
}

// score = rating × log10(ratingsCount + 1); livros sem avaliação ficam por último
function relevanceScore(b: GoogleBook): number {
  return b.averageRating * Math.log10(b.ratingsCount + 1)
}

export async function searchGoogleBooks(query: string, display = 12): Promise<GoogleBook[]> {
  if (!query.trim()) return []
  const url = new URL("/api/books-search", window.location.origin)
  url.searchParams.set("q", query)
  url.searchParams.set("maxResults", "30")

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error("Erro ao buscar na Google Books.")
  const data = await res.json()

  const books: GoogleBook[] = (data.items ?? []).map(toGoogleBook)
  books.sort((a, b) => relevanceScore(b) - relevanceScore(a))
  return books.slice(0, display)
}
