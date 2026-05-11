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
  // Forçar HTTPS e remover parâmetro de zoom para obter melhor qualidade
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
  }
}

export async function searchGoogleBooks(query: string, maxResults = 12): Promise<GoogleBook[]> {
  if (!query.trim()) return []
  const url = new URL("https://www.googleapis.com/books/v1/volumes")
  url.searchParams.set("q", query)
  url.searchParams.set("maxResults", String(maxResults))
  url.searchParams.set("printType", "books")
  url.searchParams.set("langRestrict", "pt")   // prioriza PT; remova se quiser resultados globais

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error("Erro ao buscar na Google Books.")
  const data = await res.json()
  return (data.items ?? []).map(toGoogleBook)
}
