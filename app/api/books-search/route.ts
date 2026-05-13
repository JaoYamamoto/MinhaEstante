import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const maxResults = req.nextUrl.searchParams.get('maxResults') ?? '12'

  if (!q?.trim()) {
    return NextResponse.json({ items: [] })
  }

  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', q)
  url.searchParams.set('maxResults', maxResults)
  url.searchParams.set('printType', 'books')

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (apiKey) url.searchParams.set('key', apiKey)

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
    if (res.status === 429) {
      return NextResponse.json({ error: 'Limite de requisições atingido. Configure GOOGLE_BOOKS_API_KEY no .env.local.' }, { status: 429 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Google Books error', status: res.status }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao conectar com Google Books.' }, { status: 500 })
  }
}
