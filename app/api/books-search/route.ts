import { NextRequest, NextResponse } from 'next/server'

const TIMEOUT_MS  = 5_000   // 5s por tentativa (pior caso ~11.5s com 1 retry)
const MAX_RETRIES = 1        // tenta até 2x (1 original + 1 retry)

async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next:   { revalidate: 300 }, // cache de 5 min no servidor (era 60s)
    })
    clearTimeout(timer)

    // 429: respeita Retry-After se disponível, senão usa backoff
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0', 10)
      const wait = retryAfter > 0 ? retryAfter * 1000 : 1500 * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, wait))
      return fetchWithRetry(url, attempt + 1)
    }

    return res
  } catch (err: any) {
    clearTimeout(timer)

    const isRetryable =
      err?.name === 'AbortError' ||   // timeout
      err?.name === 'TypeError'        // rede

    if (isRetryable && attempt < MAX_RETRIES) {
      const wait = 1500 * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, wait))
      return fetchWithRetry(url, attempt + 1)
    }

    // Classifica o erro para o cliente saber o que mostrar
    if (err?.name === 'AbortError') throw new Error('TIMEOUT')
    throw new Error('NETWORK')
  }
}

export async function GET(req: NextRequest) {
  const q          = req.nextUrl.searchParams.get('q')
  const maxResults = req.nextUrl.searchParams.get('maxResults') ?? '30'

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
    const res = await fetchWithRetry(url.toString())

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'RATE_LIMIT' },
        { status: 429 }
      )
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `HTTP_${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (err: any) {
    const code = err?.message === 'TIMEOUT' ? 'TIMEOUT' : 'NETWORK'
    return NextResponse.json({ error: code }, { status: 503 })
  }
}
