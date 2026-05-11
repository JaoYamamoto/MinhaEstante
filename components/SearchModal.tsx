'use client'
import { useState, useEffect, useRef } from 'react'
import { searchGoogleBooks, type GoogleBook } from '@/lib/googleBooks'
import { type BookInput } from '@/lib/api'

interface Props {
  userId: number
  onAdd: (payload: BookInput) => Promise<void>
  onClose: () => void
}

export default function SearchModal({ userId, onAdd, onClose }: Props) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<GoogleBook[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [adding,  setAdding]  = useState<string | null>(null) // google id being added
  const [added,   setAdded]   = useState<Set<string>>(new Set())
  const inputRef  = useRef<HTMLInputElement>(null)
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // focus input on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleQueryChange(v: string) {
    setQuery(v)
    if (debounce.current) clearTimeout(debounce.current)
    if (!v.trim()) { setResults([]); return }
    debounce.current = setTimeout(() => doSearch(v), 500)
  }

  async function doSearch(q: string) {
    setError(''); setLoading(true)
    try { setResults(await searchGoogleBooks(q)) }
    catch { setError('Erro ao buscar. Tente novamente.') }
    finally { setLoading(false) }
  }

  async function handleAdd(book: GoogleBook) {
    setAdding(book.id)
    try {
      await onAdd({
        user_id:        userId,
        google_books_id: book.id,
        title:          book.title,
        authors:        book.authors.join(', ') || null,
        publisher:      book.publisher || null,
        published_date: book.publishedDate || null,
        description:    book.description || null,
        page_count:     book.pageCount || null,
        categories:     book.categories.join(', ') || null,
        language:       book.language || null,
        cover_url:      book.coverUrl,
        status:         'want_to_read',
      })
      setAdded(prev => new Set(prev).add(book.id))
    } catch (e: any) {
      setError(e.message ?? 'Erro ao adicionar livro.')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-modal">
        {/* Header */}
        <div className="search-modal__header">
          <h2 className="search-modal__title">Buscar livros</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {/* Search input */}
        <div className="search-modal__input-wrap">
          <span className="search-modal__icon">🔍</span>
          <input
            ref={inputRef}
            className="search-modal__input"
            type="text"
            placeholder="Título, autor ou ISBN…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
          />
          {query && (
            <button className="search-modal__clear" onClick={() => { setQuery(''); setResults([]) }}>✕</button>
          )}
        </div>

        {error && <p className="search-modal__error">{error}</p>}

        {/* Results */}
        <div className="search-modal__results">
          {loading && (
            <div className="search-modal__loading">
              <div className="spinner" /><span>Buscando…</span>
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <p className="search-modal__empty">Nenhum resultado para "{query}".</p>
          )}

          {!loading && results.length === 0 && !query.trim() && (
            <div className="search-modal__hint">
              <p>Digite o nome de um livro, autor ou ISBN para começar.</p>
            </div>
          )}

          {results.map(book => {
            const isAdded   = added.has(book.id)
            const isAdding  = adding === book.id
            return (
              <div key={book.id} className="search-result">
                <div className="search-result__cover">
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} loading="lazy" />
                    : <div className="search-result__no-cover">📖</div>}
                </div>
                <div className="search-result__info">
                  <p className="search-result__title">{book.title}</p>
                  {book.authors.length > 0 && (
                    <p className="search-result__authors">{book.authors.join(', ')}</p>
                  )}
                  <div className="search-result__meta">
                    {book.publishedDate && <span>{book.publishedDate.slice(0, 4)}</span>}
                    {book.pageCount > 0 && <span>{book.pageCount} págs.</span>}
                    {book.language && <span className="lang-badge">{book.language.toUpperCase()}</span>}
                  </div>
                  {book.description && (
                    <p className="search-result__desc">{book.description.slice(0, 120)}…</p>
                  )}
                </div>
                <button
                  className={`search-result__add-btn ${isAdded ? 'added' : ''}`}
                  onClick={() => !isAdded && handleAdd(book)}
                  disabled={isAdding || isAdded}
                >
                  {isAdding ? '…' : isAdded ? '✓' : '+'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
