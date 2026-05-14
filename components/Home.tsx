'use client'
import { useState, useEffect, useCallback } from 'react'
import { type UserPublic, type BookData, type BookInput,
         apiListBooks, apiAddBook, apiUpdateBook, apiDeleteBook } from '@/lib/api'
import SearchModal from './SearchModal'
import BookOverlay from './BookOverlay'

const STATUS_LABELS: Record<string, string> = {
  all:          'Todos',
  want_to_read: 'Quero ler',
  reading:      'Lendo',
  read:         'Lido',
}

interface Props { user: UserPublic; onLogout: () => void }

export default function Home({ user, onLogout }: Props) {
  const [books,       setBooks]       = useState<BookData[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [showSearch,  setShowSearch]  = useState(false)
  const [activeBook,  setActiveBook]  = useState<BookData | null>(null)
  const [filter,      setFilter]      = useState<string>('all')

  // ── Fetch books ────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try { setBooks(await apiListBooks(user.id)) }
    catch { setError('Erro ao carregar livros.') }
    finally { setLoading(false) }
  }, [user.id])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  // ── CRUD handlers ──────────────────────────────────────────────────────
  async function handleAddBook(payload: BookInput) {
    const newBook = await apiAddBook(payload)
    setBooks(prev => [newBook, ...prev])
  }

  async function handleUpdateBook(id: number, payload: Partial<BookInput>) {
    const updated = await apiUpdateBook(id, payload)
    setBooks(prev => prev.map(b => b.id === id ? updated : b))
    setActiveBook(updated)
  }

  async function handleDeleteBook(id: number) {
    await apiDeleteBook(id, user.id)
    setBooks(prev => prev.filter(b => b.id !== id))
    setActiveBook(null)
  }

  // ── Filtered view ──────────────────────────────────────────────────────
  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter)
  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="home-page">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar__brand">
          <img src="/logo.png" alt="Logo" className="navbar__logo" />
          <span className="navbar__name">Minha Estante</span>
        </div>
        <div className="navbar__user">
          <div className="avatar">{initials}</div>
          <span className="navbar__username">{user.username}</span>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </nav>

      {/* ── Shelf header ── */}
      <div className="shelf-header">
        <div className="shelf-header__left">
          <h2 className="shelf-title">Minha Estante</h2>
          <span className="shelf-count">{books.length} {books.length === 1 ? 'livro' : 'livros'}</span>
        </div>
        <button className="btn-add-book" onClick={() => setShowSearch(true)}>
          <span>+</span> Adicionar livro
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="filter-tabs">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = key === 'all' ? books.length : books.filter(b => b.status === key).length
          return (
            <button key={key}
              className={`filter-tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}>
              {label}
              <span className="filter-tab__count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Main content ── */}
      <main className="shelf-content">
        {error && <p className="shelf-error">{error}</p>}

        {loading && (
          <div className="shelf-loading">
            {[...Array(6)].map((_, i) => <div key={i} className="book-skeleton" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="shelf-empty">
            <div className="shelf-empty__icon">📚</div>
            <p className="shelf-empty__title">
              {filter === 'all' ? 'Sua estante está vazia' : `Nenhum livro em "${STATUS_LABELS[filter]}"`}
            </p>
            <p className="shelf-empty__sub">
              {filter === 'all'
                ? 'Clique em "Adicionar livro" para começar sua coleção.'
                : 'Adicione livros ou altere o status dos existentes.'}
            </p>
            {filter === 'all' && (
              <button className="btn-add-book" onClick={() => setShowSearch(true)}>
                + Adicionar livro
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="book-grid">
            {filtered.map(book => (
              <button key={book.id} className="book-card" onClick={() => setActiveBook(book)}>
                <div className="book-card__cover-wrap">
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="book-card__cover" loading="lazy" />
                    : <div className="book-card__no-cover">
                        <span>📖</span>
                        <p>{book.title}</p>
                      </div>}
                  <div className={`book-card__status-dot status-${book.status}`} title={STATUS_LABELS[book.status]} />
                </div>
                <div className="book-card__info">
                  <p className="book-card__title">{book.title}</p>
                  {book.authors && <p className="book-card__author">{book.authors.split(',')[0]}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {showSearch && (
        <SearchModal
          userId={user.id}
          existingBooks={books}
          onAdd={handleAddBook}
          onClose={() => setShowSearch(false)}
        />
      )}

      {activeBook && (
        <BookOverlay
          book={activeBook}
          userId={user.id}
          onUpdate={handleUpdateBook}
          onDelete={handleDeleteBook}
          onClose={() => setActiveBook(null)}
        />
      )}
    </div>
  )
}
