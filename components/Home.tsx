'use client'

import Image from 'next/image'

interface HomeProps {
  userEmail: string
  onLogout: () => void
}

export default function Home({ userEmail, onLogout }: HomeProps) {
  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <div className="home-page">
      <nav className="navbar">
        <a className="navbar__brand" href="#">
          <Image src="/logo.jpg" alt="Logo" width={36} height={36} className="navbar__logo" />
          <span className="navbar__name">Minha Estante</span>
        </a>
        <div className="navbar__user">
          <div className="avatar">{initials}</div>
          <button
            onClick={onLogout}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.85rem',
              color: '#888',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
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
