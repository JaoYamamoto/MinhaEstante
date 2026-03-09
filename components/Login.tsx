'use client'

import { useState } from 'react'
import { apiLogin, type UserPublic } from '@/lib/api'

interface LoginProps {
  onLogin: (user: UserPublic) => void
  onGoToRegister: () => void
}

export default function Login({ onLogin, onGoToRegister }: LoginProps) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!email || !password) { setError('Preencha todos os campos.'); return }
    setError('')
    setLoading(true)
    try {
      const user = await apiLogin(email, password)
      onLogin(user)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-sidebar">
        <div className="login-sidebar__logo-wrap">
          <img src="/logo.png" alt="Logo" width={80} height={80} className="login-sidebar__logo" />
        </div>
        <h2 className="login-sidebar__title">Minha Estante</h2>
        <p className="login-sidebar__sub">
          Organize, descubra e acompanhe os livros que fazem parte da sua história.
        </p>
      </aside>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="step-indicator">
            <div className="step-dot active" />
            <div className="step-dot active" />
          </div>

          <h1 className="login-card__heading">Bem-vindo!</h1>
          <p className="login-card__sub">Entre com seu e-mail e senha.</p>

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              className="form-input"
              type="email" placeholder="seu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrap">
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button" className="pass-toggle"
                onClick={() => setShowPass(p => !p)}
                aria-label="Mostrar/ocultar senha"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="auth-switch">
            Não tem conta?{' '}
            <button className="resend-btn" onClick={onGoToRegister}>Criar conta</button>
          </p>
        </div>
      </div>
    </div>
  )
}
