'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import Image from 'next/image'
import emailjs from '@emailjs/browser'
import { generateOtp, verifyOtp, clearOtp } from '@/lib/otp'

// ── EmailJS config – preencha as variáveis em .env.local ──────────────────
const EMAILJS_PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
const EMAILJS_SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!
// ──────────────────────────────────────────────────────────────────────────

interface LoginProps {
  onLogin: (email: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep]         = useState<'email' | 'otp'>('email')
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [cooldown, setCooldown] = useState(0)
  const otpRefs  = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startCooldown(seconds = 60) {
    setCooldown(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function sendOtpEmail(targetEmail: string): Promise<void> {
    const code = generateOtp(targetEmail)
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      { to_email: targetEmail, otp_code: code, expires_in: '10' },
      EMAILJS_PUBLIC_KEY,
    )
  }

  async function handleSendOtp() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor, insira um e-mail válido.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await sendOtpEmail(email)
      setStep('otp')
      startCooldown(60)
    } catch (err) {
      console.error('EmailJS error:', err)
      setError('Não foi possível enviar o código. Verifique sua configuração do EmailJS.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length < 6) { setError('Insira todos os 6 dígitos.'); return }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    setLoading(false)
    if (verifyOtp(email, code)) {
      if (timerRef.current) clearInterval(timerRef.current)
      onLogin(email)
    } else {
      setError('Código incorreto ou expirado. Tente novamente.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    clearOtp()
    setOtp(['', '', '', '', '', ''])
    setError('')
    setLoading(true)
    try {
      await sendOtpEmail(email)
      startCooldown(60)
    } catch {
      setError('Falha ao reenviar o código. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    clearOtp()
    if (timerRef.current) clearInterval(timerRef.current)
    setCooldown(0)
    setOtp(['', '', '', '', '', ''])
    setError('')
    setStep('email')
  }

  return (
    <div className="login-page">
      <aside className="login-sidebar">
        <div className="login-sidebar__logo-wrap">
          <Image src="/logo.jpg" alt="Logo" width={80} height={80} className="login-sidebar__logo" />
        </div>
        <h2 className="login-sidebar__title">Minha Estante</h2>
        <p className="login-sidebar__sub">
          Organize, descubra e acompanhe os livros que fazem parte da sua história.
        </p>
      </aside>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="step-indicator">
            <div className={`step-dot ${step === 'email' || step === 'otp' ? 'active' : ''}`} />
            <div className={`step-dot ${step === 'otp' ? 'active' : ''}`} />
          </div>

          {step === 'email' ? (
            <>
              <h1 className="login-card__heading">Bem-vindo!</h1>
              <p className="login-card__sub">Insira seu e-mail para continuar.</p>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  autoFocus
                />
                {error && <p className="error-msg">{error}</p>}
              </div>
              <button className="btn-primary" onClick={handleSendOtp} disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar código'}
              </button>
            </>
          ) : (
            <>
              <button className="back-btn" onClick={handleBack}>← Voltar</button>
              <h1 className="login-card__heading">Verifique seu e-mail</h1>
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
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
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
                {loading ? 'Verificando…' : 'Entrar'}
              </button>
              <div className="resend-row">
                Não recebeu?{' '}
                {cooldown > 0 ? (
                  <span style={{ color: '#aaa' }}>Reenviar em {cooldown}s</span>
                ) : (
                  <button className="resend-btn" onClick={handleResend} disabled={loading}>
                    Reenviar código
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
