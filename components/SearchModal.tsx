'use client'
import { useState, useEffect, useRef } from 'react'
import { searchGoogleBooks, type GoogleBook } from '@/lib/googleBooks'
import { type BookInput, type BookData } from '@/lib/api'

type Tab = 'search' | 'manual' | 'shelf'

interface ManualForm {
  title: string; authors: string; publisher: string
  published_date: string; page_count: string; description: string; cover_url: string
}
const EMPTY: ManualForm = {
  title: '', authors: '', publisher: '',
  published_date: '', page_count: '', description: '', cover_url: '',
}

function friendlyError(code: string): string {
  if (code === 'RATE_LIMIT') return 'Muitas buscas seguidas. Aguarde alguns segundos e tente novamente.'
  if (code === 'TIMEOUT')    return 'A busca demorou demais (conexão lenta). Tente de novo ou use o modo manual.'
  if (code === 'NETWORK')    return 'Sem conexão com a internet. Use o modo manual para adicionar sem busca.'
  return 'Erro ao buscar livros. Tente novamente ou use o modo manual.'
}

interface Props {
  userId: number
  existingBooks: BookData[]
  onAdd: (payload: BookInput) => Promise<void>
  onClose: () => void
}

export default function SearchModal({ userId, existingBooks, onAdd, onClose }: Props) {
  // ── busca ──────────────────────────────────────────────────────────────
  const [tab,     setTab]     = useState<Tab>('search')
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<GoogleBook[]>([])
  const [loading, setLoading] = useState(false)
  const [slow,    setSlow]    = useState(false)
  const [error,   setError]   = useState('')
  const [adding,  setAdding]  = useState<string | null>(null)
  const [added,   setAdded]   = useState<Set<string>>(new Set())
  const inputRef  = useRef<HTMLInputElement>(null)
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqId     = useRef(0)

  // ── manual ─────────────────────────────────────────────────────────────
  const [manual,      setManual]      = useState<ManualForm>(EMPTY)
  const [manualErr,   setManualErr]   = useState('')
  const [manualSaving,setManualSaving]= useState(false)

  // ── estante ────────────────────────────────────────────────────────────
  const [shelfQ, setShelfQ] = useState('')

  useEffect(() => { if (tab === 'search') inputRef.current?.focus() }, [tab])

  useEffect(() => {
    return () => {
      if (debounce.current)  clearTimeout(debounce.current)
      if (slowTimer.current) clearTimeout(slowTimer.current)
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { tab !== 'search' ? setTab('search') : onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, tab])

  // ── busca Google Books (debounce 1000ms) ───────────────────────────────
  function handleQueryChange(v: string) {
    setQuery(v)
    if (debounce.current) clearTimeout(debounce.current)
    if (!v.trim()) { setResults([]); setError(''); setSlow(false); return }
    debounce.current = setTimeout(() => doSearch(v), 1000)
  }

  async function doSearch(q: string) {
    const id = ++reqId.current
    setError(''); setSlow(false); setLoading(true)
    slowTimer.current = setTimeout(() => setSlow(true), 3000)
    try {
      const books = await searchGoogleBooks(q)
      if (id !== reqId.current) return
      setResults(books)
    } catch (e: any) {
      if (id !== reqId.current) return
      setError(friendlyError(e?.message ?? ''))
      setResults([])
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current)
      if (id === reqId.current) { setLoading(false); setSlow(false) }
    }
  }

  async function handleAdd(book: GoogleBook) {
    setAdding(book.id)
    try {
      await onAdd({
        user_id:         userId,
        google_books_id: book.id,
        title:           book.title,
        authors:         book.authors.join(', ') || null,
        publisher:       book.publisher || null,
        published_date:  book.publishedDate || null,
        description:     book.description || null,
        page_count:      book.pageCount || null,
        categories:      book.categories.join(', ') || null,
        language:        book.language || null,
        cover_url:       book.coverUrl,
        status:          'want_to_read',
      })
      setAdded(prev => new Set(prev).add(book.id))
    } catch (e: any) {
      setError(e.message ?? 'Erro ao adicionar livro.')
    } finally {
      setAdding(null)
    }
  }

  // ── manual ─────────────────────────────────────────────────────────────
  function setField(k: keyof ManualForm, v: string) {
    setManual(p => ({ ...p, [k]: v })); setManualErr('')
  }

  async function handleManualSave() {
    if (!manual.title.trim()) { setManualErr('O título é obrigatório.'); return }
    setManualErr(''); setManualSaving(true)
    try {
      await onAdd({
        user_id:        userId,
        title:          manual.title.trim(),
        authors:        manual.authors.trim()        || null,
        publisher:      manual.publisher.trim()      || null,
        published_date: manual.published_date.trim() || null,
        page_count:     manual.page_count ? Number(manual.page_count) : null,
        description:    manual.description.trim()    || null,
        cover_url:      manual.cover_url.trim()      || null,
        status:         'want_to_read',
      })
      setManual(EMPTY); onClose()
    } catch (e: any) {
      setManualErr(e.message ?? 'Erro ao salvar.')
    } finally {
      setManualSaving(false)
    }
  }

  // ── filtro local da estante ────────────────────────────────────────────
  const shelfResults = shelfQ.trim().length >= 2
    ? existingBooks.filter(b => {
        const q = shelfQ.toLowerCase()
        return b.title.toLowerCase().includes(q) || (b.authors ?? '').toLowerCase().includes(q)
      })
    : []

  const STATUS_LABELS: Record<string, string> = {
    want_to_read: 'Quero ler', reading: 'Lendo', read: 'Lido',
  }
  const STATUS_COLORS: Record<string, string> = {
    want_to_read: '#7d4060', reading: '#2e7d8f', read: '#2e7d52',
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-modal">

        {/* Header */}
        <div className="search-modal__header">
          <h2 className="search-modal__title">Adicionar livro</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {/* Tabs */}
        <div className="search-modal__tabs">
          <button className={`sm-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>🔍 Buscar</button>
          <button className={`sm-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>✏️ Manual</button>
          <button className={`sm-tab ${tab === 'shelf'  ? 'active' : ''}`} onClick={() => setTab('shelf')}>📚 Na estante</button>
        </div>

        {/* ── ABA BUSCA ── */}
        {tab === 'search' && (<>
          <div className="search-modal__input-wrap">
            <span className="search-modal__icon">🔍</span>
            <input ref={inputRef} className="search-modal__input" type="text"
              placeholder="Título, autor ou ISBN…" value={query}
              onChange={e => handleQueryChange(e.target.value)} />
            {query && <button className="search-modal__clear"
              onClick={() => { setQuery(''); setResults([]); setError('') }}>✕</button>}
          </div>

          {slow && !error && (
            <p className="search-modal__slow">
              ⏳ Conexão lenta — aguardando…
              <button className="link-btn" style={{ marginLeft: 8 }} onClick={() => setTab('manual')}>
                Adicionar manualmente
              </button>
            </p>
          )}

          {error && (
            <div className="search-modal__error-box">
              <span>{error}</span>
              <button className="link-btn" onClick={() => setTab('manual')}>
                Adicionar manualmente →
              </button>
            </div>
          )}

          <div className="search-modal__results">
            {loading && (
              <div className="search-modal__loading">
                <div className="spinner" />
                <span>{slow ? 'Conexão lenta, aguardando…' : 'Buscando…'}</span>
              </div>
            )}
            {!loading && results.length === 0 && query.trim() && !error && (
              <p className="search-modal__empty">Nenhum resultado para "{query}".</p>
            )}
            {!loading && !query.trim() && (
              <div className="search-modal__hint">
                <p>Digite o nome de um livro, autor ou ISBN para começar.</p>
                <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#aaa' }}>
                  Sem internet? Use a aba <strong>✏️ Manual</strong>.
                </p>
              </div>
            )}
            {results.map(book => {
              const isAdded  = added.has(book.id)
              const isAdding = adding === book.id
              return (
                <div key={book.id} className="search-result">
                  <div className="search-result__cover">
                    {book.coverUrl
                      ? <img src={book.coverUrl} alt={book.title} loading="lazy" />
                      : <div className="search-result__no-cover">📖</div>}
                  </div>
                  <div className="search-result__info">
                    <p className="search-result__title">{book.title}</p>
                    {book.authors.length > 0 && <p className="search-result__authors">{book.authors.join(', ')}</p>}
                    <div className="search-result__meta">
                      {book.publishedDate && <span>{book.publishedDate.slice(0, 4)}</span>}
                      {book.pageCount > 0  && <span>{book.pageCount} págs.</span>}
                      {book.language       && <span className="lang-badge">{book.language.toUpperCase()}</span>}
                      {book.averageRating > 0 && <span>⭐ {book.averageRating.toFixed(1)}</span>}
                    </div>
                    {book.description && <p className="search-result__desc">{book.description.slice(0, 120)}…</p>}
                  </div>
                  <button className={`search-result__add-btn ${isAdded ? 'added' : ''}`}
                    onClick={() => !isAdded && handleAdd(book)} disabled={isAdding || isAdded}>
                    {isAdding ? '…' : isAdded ? '✓' : '+'}
                  </button>
                </div>
              )
            })}
          </div>
        </>)}

        {/* ── ABA MANUAL ── */}
        {tab === 'manual' && (
          <div className="search-modal__manual">
            <p className="search-modal__manual-sub">
              Adicione um livro preenchendo os dados — sem precisar de internet.
            </p>
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" value={manual.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Ex.: Dom Casmurro" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Autor(es)</label>
              <input className="form-input" value={manual.authors}
                onChange={e => setField('authors', e.target.value)}
                placeholder="Ex.: Machado de Assis" />
            </div>
            <div className="manual-row-2">
              <div className="form-group">
                <label className="form-label">Editora</label>
                <input className="form-input" value={manual.publisher}
                  onChange={e => setField('publisher', e.target.value)} placeholder="Ex.: Companhia das Letras" />
              </div>
              <div className="form-group">
                <label className="form-label">Ano</label>
                <input className="form-input" value={manual.published_date}
                  onChange={e => setField('published_date', e.target.value)} placeholder="Ex.: 1899" />
              </div>
            </div>
            <div className="manual-row-2">
              <div className="form-group">
                <label className="form-label">Nº de páginas</label>
                <input className="form-input" type="number" min={1} value={manual.page_count}
                  onChange={e => setField('page_count', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">URL da capa</label>
                <input className="form-input" type="url" value={manual.cover_url}
                  onChange={e => setField('cover_url', e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-input form-textarea" rows={3} value={manual.description}
                onChange={e => setField('description', e.target.value)} placeholder="Sinopse ou notas…" />
            </div>
            {manualErr && <p className="error-msg">{manualErr}</p>}
            <div className="manual-actions">
              <button className="btn-secondary" onClick={() => setTab('search')}>← Voltar</button>
              <button className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }}
                onClick={handleManualSave} disabled={manualSaving}>
                {manualSaving ? 'Salvando…' : 'Adicionar à estante'}
              </button>
            </div>
          </div>
        )}

        {/* ── ABA NA ESTANTE ── */}
        {tab === 'shelf' && (
          <div className="search-modal__shelf">
            <p className="search-modal__manual-sub">
              Pesquise entre os livros já na sua estante — funciona offline.
            </p>
            <div className="search-modal__input-wrap">
              <span className="search-modal__icon">🔍</span>
              <input className="search-modal__input" type="text" placeholder="Título ou autor…"
                value={shelfQ} onChange={e => setShelfQ(e.target.value)} autoFocus />
              {shelfQ && <button className="search-modal__clear" onClick={() => setShelfQ('')}>✕</button>}
            </div>
            <div className="search-modal__results">
              {shelfQ.trim().length < 2 && (
                <p className="search-modal__empty" style={{ marginTop: 24 }}>
                  Digite pelo menos 2 caracteres para filtrar.
                </p>
              )}
              {shelfQ.trim().length >= 2 && shelfResults.length === 0 && (
                <p className="search-modal__empty">Nenhum livro corresponde a "{shelfQ}".</p>
              )}
              {shelfResults.map(book => (
                <div key={book.id} className="search-result">
                  <div className="search-result__cover">
                    {book.cover_url
                      ? <img src={book.cover_url} alt={book.title} loading="lazy" />
                      : <div className="search-result__no-cover">📖</div>}
                  </div>
                  <div className="search-result__info">
                    <p className="search-result__title">{book.title}</p>
                    {book.authors && <p className="search-result__authors">{book.authors}</p>}
                    <div className="search-result__meta">
                      {book.published_date && <span>{book.published_date.slice(0, 4)}</span>}
                      {book.page_count     && <span>{book.page_count} págs.</span>}
                      <span className="lang-badge"
                        style={{ background: STATUS_COLORS[book.status], color: '#fff' }}>
                        {STATUS_LABELS[book.status]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
