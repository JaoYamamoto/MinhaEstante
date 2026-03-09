'use client'

import { type UserPublic } from '@/lib/api'

interface HomeProps {
  user: UserPublic
  onLogout: () => void
}

export default function Home({ user, onLogout }: HomeProps) {
  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="home-page">
      <nav className="navbar">
        <a className="navbar__brand" href="#">
          <img src="/logo.png" alt="Logo" width={36} height={36} className="navbar__logo" />
          <span className="navbar__name">Minha Estante</span>
        </a>
        <div className="navbar__user">
          <div className="avatar">{initials}</div>
          <span style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>
            {user.username}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: '1px solid #ddd', borderRadius: '8px',
              padding: '6px 14px', fontSize: '0.85rem', color: '#888',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="home-content">
        <div className="home-empty-icon">📚</div>
        <p className="home-empty-text">Sua estante está vazia por enquanto.</p>
      </div>
    </div>
  )
}
