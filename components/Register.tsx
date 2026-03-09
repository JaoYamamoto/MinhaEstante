'use client'

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import emailjs from '@emailjs/browser'
import { generateOtp, verifyOtp, clearOtp } from '@/lib/otp'
import { apiCompleteRegister, type UserPublic } from '@/lib/api'

const EMAILJS_PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
const EMAILJS_SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!

type Step = 'data' | 'otp' | 'done'

interface RegisterProps {
  onRegistered: (user: UserPublic) => void
  onGoToLogin: () => void
}

// ── Validações locais (sem rede) ──────────────────────────────────────────────
function validateFields(email: string, username: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Insira um e-mail válido.'
  if (!username || username.length < 3)
    return 'Username deve ter no mínimo 3 caracteres.'
  if (!username.replace(/[_.\w]/g, '').length === false && !/^[\w.]+$/.test(username))
    return 'Username só pode conter letras, números, _ e .'
  if (password.length < 8)
    return 'A senha deve ter no mínimo 8 caracteres.'
  if (!/\d/.test(password))
    return 'A senha deve conter ao menos um número.'
  return null
}

export default function Register({ onRegistered, onGoToLogin }: RegisterProps) {
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [step,    setStep]    = useState<Step>('data')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [otp,      setOtp]      = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const otpRefs  = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── força da senha ────────────────────────────────────────────────────
  const passStrength = [
    password.length >= 8,
    password.length >= 8 && /\d/.test(password),
    password.length >= 12 && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password),
  ]

  // ── cooldown timer ────────────────────────────────────────────────────
  function startCooldown(secs = 60) {
    setCooldown(secs)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown(p => {
        if (p <= 1) { clearInterval(timerRef.current!); return 0 }
        return p - 1
      })
    }, 1000)
  }

  // ── envio do OTP via EmailJS ──────────────────────────────────────────
  async function sendOtpEmail() {
    const code = generateOtp(email)
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      { to_email: email, otp_code: code, expires_in: '10' },
      EMAILJS_PUBLIC_KEY,
    )
  }

  // ── passo 1: validar localmente → enviar OTP ──────────────────────────
  async function handleSubmitData() {
    setError('')
    const validationError = validateFields(email, username, password)
    if (validationError) { setError(validationError); return }

    setLoading(true)
    try {
      await sendOtpEmail()
      setStep('otp')
      startCooldown(60)
    } catch (e: any) {
      console.error('EmailJS error:', e)
      setError('Não foi possível enviar o código. Verifique sua configuração do EmailJS.')
    } finally {
      setLoading(false)
    }
  }

  // ── handlers dos inputs OTP ───────────────────────────────────────────
  function handleOtpChange(i: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]; next[i] = value; setOtp(next)
    if (value && i < 5) otpRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtp(p.split('')); otpRefs.current[5]?.focus() }
  }

  // ── passo 2: verificar OTP → persistir usuário no backend ─────────────
  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length < 6) { setError('Insira todos os 6 dígitos.'); return }
    setError('')

    if (!verifyOtp(email, code)) {
      setError('Código incorreto ou expirado.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
      return
    }

    // OTP válido — agora sim, salvar no backend
    setLoading(true)
    try {
      const user = await apiCompleteRegister(email, username, password)
      if (timerRef.current) clearInterval(timerRef.current)
      setStep('done')
      setTimeout(() => onRegistered(user), 1200)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar conta. Verifique se o backend está rodando.')
    } finally {
      setLoading(false)
    }
  }

  // ── reenviar OTP ──────────────────────────────────────────────────────
  async function handleResend() {
    if (cooldown > 0) return
    clearOtp()
    setOtp(['', '', '', '', '', ''])
    setError('')
    setLoading(true)
    try {
      await sendOtpEmail()
      startCooldown(60)
    } catch {
      setError('Falha ao reenviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const stepCount = step === 'data' ? 1 : step === 'otp' ? 2 : 3

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
            {[1, 2, 3].map(n => (
              <div key={n} className={`step-dot ${stepCount >= n ? 'active' : ''}`} />
            ))}
          </div>

          {/* ── passo 1: dados ── */}
          {step === 'data' && (
            <>
              <h1 className="login-card__heading">Criar conta</h1>
              <p className="login-card__sub">Preencha seus dados para começar.</p>

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
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  type="text" placeholder="seu_username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <div className="input-wrap">
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mín. 8 caracteres e 1 número"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitData()}
                  />
                  <button
                    type="button" className="pass-toggle"
                    onClick={() => setShowPass(p => !p)}
                    aria-label="Mostrar/ocultar senha"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                <div className="pass-strength">
                  {passStrength.map((ok, i) => (
                    <div key={i} className={`pass-bar ${ok ? 'ok' : ''}`} />
                  ))}
                </div>
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button className="btn-primary" onClick={handleSubmitData} disabled={loading}>
                {loading ? 'Enviando código…' : 'Continuar'}
              </button>

              <p className="auth-switch">
                Já tem conta?{' '}
                <button className="resend-btn" onClick={onGoToLogin}>Entrar</button>
              </p>
            </>
          )}

          {/* ── passo 2: OTP ── */}
          {step === 'otp' && (
            <>
              <button className="back-btn" onClick={() => { clearOtp(); setStep('data'); setError('') }}>
                ← Voltar
              </button>
              <h1 className="login-card__heading">Confirme seu e-mail</h1>
              <p className="login-card__sub">
                Enviamos um código de 6 dígitos para <strong>{email}</strong>. Ele expira em 10 minutos.
              </p>

              <div className="form-group">
                <label className="form-label">Código OTP</label>
                <div className="otp-row">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      className={`otp-input${digit ? ' filled' : ''}`}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {error && <p className="error-msg" style={{ textAlign: 'center' }}>{error}</p>}
              </div>

              <button
                className="btn-primary"
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length < 6}
              >
                {loading ? 'Criando conta…' : 'Verificar e criar conta'}
              </button>

              <div className="resend-row">
                Não recebeu?{' '}
                {cooldown > 0
                  ? <span style={{ color: '#aaa' }}>Reenviar em {cooldown}s</span>
                  : <button className="resend-btn" onClick={handleResend} disabled={loading}>Reenviar código</button>
                }
              </div>
            </>
          )}

          {/* ── passo 3: sucesso ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div className="success-icon">✅</div>
              <h1 className="login-card__heading" style={{ textAlign: 'center' }}>Conta criada!</h1>
              <p className="login-card__sub" style={{ textAlign: 'center' }}>
                Seja bem-vindo(a), <strong>{username}</strong>. Redirecionando…
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
