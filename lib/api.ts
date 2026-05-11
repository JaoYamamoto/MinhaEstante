const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function req<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(BASE + path)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error ?? "Erro desconhecido.")
  return data as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface UserPublic {
  id: number
  email: string
  username: string
  created_at: string
}

export async function apiCompleteRegister(
  email: string, username: string, password: string,
): Promise<UserPublic> {
  const d = await req<{ user: UserPublic }>("POST", "/auth/verify-otp", { email, username, password })
  return d.user
}

export async function apiLogin(email: string, password: string): Promise<UserPublic> {
  const d = await req<{ user: UserPublic }>("POST", "/auth/login", { email, password })
  return d.user
}

// ── Books ─────────────────────────────────────────────────────────────────────
export interface BookData {
  id: number
  google_books_id: string | null
  title: string
  authors: string | null
  publisher: string | null
  published_date: string | null
  description: string | null
  page_count: number | null
  categories: string | null
  language: string | null
  cover_url: string | null
  status: "want_to_read" | "reading" | "read"
  added_at: string
  updated_at: string
}

export type BookInput = Partial<Omit<BookData, "id" | "added_at" | "updated_at">> & {
  user_id: number
  title: string
}

export async function apiListBooks(user_id: number): Promise<BookData[]> {
  const d = await req<{ books: BookData[] }>("GET", "/books", undefined, { user_id: String(user_id) })
  return d.books
}

export async function apiAddBook(payload: BookInput): Promise<BookData> {
  const d = await req<{ book: BookData }>("POST", "/books", payload as Record<string, unknown>)
  return d.book
}

export async function apiUpdateBook(
  book_id: number,
  payload: Partial<BookInput>,
): Promise<BookData> {
  const d = await req<{ book: BookData }>("PUT", `/books/${book_id}`, payload as Record<string, unknown>)
  return d.book
}

export async function apiDeleteBook(book_id: number, user_id: number): Promise<void> {
  await req("DELETE", `/books/${book_id}`, undefined, { user_id: String(user_id) })
}
