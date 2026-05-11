'use client'
import { useState, useEffect } from 'react'
import { type BookData, type BookInput } from '@/lib/api'

const STATUS_LABELS: Record<string, string> = {
  want_to_read: 'Quero ler',
  reading:      'Lendo',
  read:         'Lido',
}
const STATUS_COLORS: Record<string, string> = {
  want_to_read: '#7d4060',
  reading:      '#2e7d8f',
  read:         '#2e7d52',
}

interface Props {
  book: BookData
  userId: number
  onUpdate: (id: number, payload: Partial<BookInput>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onClose: () => void
}

export default function BookOverlay({ book, userId, onUpdate, onDelete, onClose }: Props) {
  const [editing,  setEditing]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Editable fields
  const [title,     setTitle]     = useState(book.title)
  const [authors,   setAuthors]   = useState(book.authors ?? '')
  const [publisher, setPublisher] = useState(book.publisher ?? '')
  const [pubDate,   setPubDate]   = useState(book.published_date ?? '')
  const [pages,     setPages]     = useState(String(book.page_count ?? ''))
  const [desc,      setDesc]      = useState(book.description ?? '')
  const [status,    setStatus]    = useState(book.status)
  const [coverUrl,  setCoverUrl]  = useState(book.cover_url ?? '')

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { if (editing) setEditing(false); else onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, onClose])

  async function handleSave() {
    if (!title.trim()) { setError('O título não pode estar vazio.'); return }
    setError(''); setSaving(true)
    try {
      await onUpdate(book.id, {
        user_id:        userId,
        title:          title.trim(),
        authors:        authors.trim() || null,
        publisher:      publisher.trim() || null,
        published_date: pubDate.trim() || null,
        page_count:     pages ? Number(pages) : null,
        description:    desc.trim() || null,
        cover_url:      coverUrl.trim() || null,
        status,
      })
      setEditing(false)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try { await onDelete(book.id) }
    catch (e: any) { setError(e.message ?? 'Erro ao remover.'); setDeleting(false); setConfirmDelete(false) }
  }

  const displayCover = coverUrl || book.cover_url

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="book-overlay">

        {/* ── Header ── */}
        <div className="book-overlay__header">
          <div className="book-overlay__status-badge"
            style={{ background: STATUS_COLORS[status] }}>
            {STATUS_LABELS[status]}
          </div>
          <div className="book-overlay__header-actions">
            {!editing && (
              <button className="overlay-icon-btn" title="Editar" onClick={() => setEditing(true)}>✏️</button>
            )}
            <button className="overlay-icon-btn" title="Remover"
              onClick={() => setConfirmDelete(true)}>🗑️</button>
            <button className="overlay-icon-btn modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="book-overlay__body">
          {/* ── Cover column ── */}
          <div className="book-overlay__cover-col">
            {editing ? (
              <div className="cover-edit-wrap">
                {coverUrl
                  ? <img src={coverUrl} alt="capa" className="book-overlay__cover" />
                  : <div className="book-overlay__no-cover">📖</div>}
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">URL da capa</label>
                  <input className="form-input" type="url" placeholder="https://…"
                    value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
                </div>
              </div>
            ) : (
              displayCover
                ? <img src={displayCover} alt={book.title} className="book-overlay__cover" />
                : <div className="book-overlay__no-cover">📖</div>
            )}

            {/* Status selector */}
            <div className="status-selector">
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <button key={val}
                  className={`status-btn ${status === val ? 'active' : ''}`}
                  style={status === val ? { background: STATUS_COLORS[val], color: '#fff' } : {}}
                  onClick={() => editing || setStatus(val as BookData['status'])}
                  disabled={!editing && status !== val}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Info column ── */}
          <div className="book-overlay__info-col">
            {editing ? (
              <>
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input className="form-input" value={title}
                    onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Autor(es)</label>
                  <input className="form-input" placeholder="Autor A, Autor B"
                    value={authors} onChange={e => setAuthors(e.target.value)} />
                </div>
                <div className="overlay-row-2">
                  <div className="form-group">
                    <label className="form-label">Editora</label>
                    <input className="form-input" value={publisher}
                      onChange={e => setPublisher(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Publicação</label>
                    <input className="form-input" placeholder="AAAA-MM-DD"
                      value={pubDate} onChange={e => setPubDate(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nº de páginas</label>
                  <input className="form-input" type="number" min={1}
                    value={pages} onChange={e => setPages(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input form-textarea" rows={5}
                    value={desc} onChange={e => setDesc(e.target.value)} />
                </div>
                {error && <p className="error-msg">{error}</p>}
                <div className="overlay-edit-actions">
                  <button className="btn-secondary" onClick={() => { setEditing(false); setError('') }}>Cancelar</button>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="book-overlay__title">{book.title}</h2>
                {book.authors && <p className="book-overlay__authors">{book.authors}</p>}

                <div className="book-overlay__meta">
                  {book.publisher     && <span><strong>Editora:</strong> {book.publisher}</span>}
                  {book.published_date && <span><strong>Publicado:</strong> {book.published_date.slice(0, 4)}</span>}
                  {book.page_count    && <span><strong>Páginas:</strong> {book.page_count}</span>}
                  {book.language      && <span><strong>Idioma:</strong> {book.language.toUpperCase()}</span>}
                  {book.categories    && <span><strong>Categorias:</strong> {book.categories}</span>}
                </div>

                {book.description && (
                  <div className="book-overlay__desc">
                    <p>{book.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Confirm delete dialog ── */}
        {confirmDelete && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <p>Remover <strong>"{book.title}"</strong> da sua estante?</p>
              <div className="confirm-actions">
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancelar
                </button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Removendo…' : 'Remover'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
