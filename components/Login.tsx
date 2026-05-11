'use client'
import { useState } from 'react'
import { apiLogin, type UserPublic } from '@/lib/api'

interface Props { onLogin: (u: UserPublic) => void; onGoToRegister: () => void }

export default function Login({ onLogin, onGoToRegister }: Props) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!email || !password) { setError('Preencha todos os campos.'); return }
    setError(''); setLoading(true)
    try { onLogin(await apiLogin(email, password)) }
    catch (e: any) { setError(e.message ?? 'Erro ao entrar.') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <aside className="auth-sidebar">
        <div className="auth-sidebar__logo-wrap">
          <img src="/logo.png" alt="Logo" className="auth-sidebar__logo" />
        </div>
        <h2 className="auth-sidebar__title">Minha Estante</h2>
        <p className="auth-sidebar__sub">Organize, descubra e acompanhe os livros que fazem parte da sua história.</p>
      </aside>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="step-indicator">
            <div className="step-dot active" /><div className="step-dot active" />
          </div>
          <h1 className="auth-heading">Bem-vindo!</h1>
          <p className="auth-sub">Entre com seu e-mail e senha.</p>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" placeholder="seu@email.com"
              value={email} onChange={e => { setEmail(e.target.value); setError('') }} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrap">
              <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Sua senha"
                value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>
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
            <button className="link-btn" onClick={onGoToRegister}>Criar conta</button>
          </p>
        </div>
      </div>
    </div>
  )
}
