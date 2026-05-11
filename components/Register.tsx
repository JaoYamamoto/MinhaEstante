'use client'
import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import emailjs from '@emailjs/browser'
import { generateOtp, verifyOtp, clearOtp } from '@/lib/otp'
import { apiCompleteRegister, type UserPublic } from '@/lib/api'

const PK  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
const SID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!
const TID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!

type Step = 'data' | 'otp' | 'done'
interface Props { onRegistered: (u: UserPublic) => void; onGoToLogin: () => void }

function validate(email: string, username: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Insira um e-mail válido.'
  if (!username || username.length < 3) return 'Username deve ter no mínimo 3 caracteres.'
  if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.'
  if (!/\d/.test(password)) return 'A senha deve conter ao menos um número.'
  return null
}

export default function Register({ onRegistered, onGoToLogin }: Props) {
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [step,     setStep]     = useState<Step>('data')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [otp,      setOtp]      = useState(['','','','','',''])
  const [cooldown, setCooldown] = useState(0)
  const refs    = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const strength = [password.length >= 8, password.length >= 8 && /\d/.test(password),
                    password.length >= 12 && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password)]

  function startCooldown(s = 60) {
    setCooldown(s)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() =>
      setCooldown(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0 } return p - 1 }), 1000)
  }

  async function sendOtp() {
    const code = generateOtp(email)
    await emailjs.send(SID, TID, { to_email: email, otp_code: code, expires_in: '10' }, PK)
  }

  async function handleSubmitData() {
    setError('')
    const err = validate(email, username, password)
    if (err) { setError(err); return }
    setLoading(true)
    try { await sendOtp(); setStep('otp'); startCooldown(60) }
    catch { setError('Não foi possível enviar o código. Verifique sua configuração do EmailJS.') }
    finally { setLoading(false) }
  }

  function handleOtpChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return
    const n = [...otp]; n[i] = v; setOtp(n)
    if (v && i < 5) refs.current[i + 1]?.focus()
  }
  function handleOtpKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtp(p.split('')); refs.current[5]?.focus() }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length < 6) { setError('Insira todos os 6 dígitos.'); return }
    setError('')
    if (!verifyOtp(email, code)) {
      setError('Código incorreto ou expirado.')
      setOtp(['','','','','','']); refs.current[0]?.focus(); return
    }
    setLoading(true)
    try {
      const user = await apiCompleteRegister(email, username, password)
      if (timerRef.current) clearInterval(timerRef.current)
      setStep('done')
      setTimeout(() => onRegistered(user), 1200)
    } catch (e: any) { setError(e.message ?? 'Erro ao criar conta.') }
    finally { setLoading(false) }
  }

  async function handleResend() {
    if (cooldown > 0) return
    clearOtp(); setOtp(['','','','','','']); setError(''); setLoading(true)
    try { await sendOtp(); startCooldown(60) }
    catch { setError('Falha ao reenviar.') }
    finally { setLoading(false) }
  }

  const stepNum = step === 'data' ? 1 : step === 'otp' ? 2 : 3

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
            {[1,2,3].map(n => <div key={n} className={`step-dot ${stepNum >= n ? 'active' : ''}`} />)}
          </div>

          {step === 'data' && <>
            <h1 className="auth-heading">Criar conta</h1>
            <p className="auth-sub">Preencha seus dados para começar.</p>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" placeholder="seu@email.com"
                value={email} onChange={e => { setEmail(e.target.value); setError('') }} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" placeholder="seu_username"
                value={username} onChange={e => { setUsername(e.target.value); setError('') }} />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <div className="input-wrap">
                <input className="form-input" type={showPass ? 'text' : 'password'}
                  placeholder="Mín. 8 caracteres e 1 número" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitData()} />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="pass-strength">
                {strength.map((ok, i) => <div key={i} className={`pass-bar ${ok ? 'ok' : ''}`} />)}
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" onClick={handleSubmitData} disabled={loading}>
              {loading ? 'Enviando código…' : 'Continuar'}
            </button>
            <p className="auth-switch">
              Já tem conta?{' '}
              <button className="link-btn" onClick={onGoToLogin}>Entrar</button>
            </p>
          </>}

          {step === 'otp' && <>
            <button className="back-btn" onClick={() => { clearOtp(); setStep('data'); setError('') }}>← Voltar</button>
            <h1 className="auth-heading">Confirme seu e-mail</h1>
            <p className="auth-sub">Enviamos um código de 6 dígitos para <strong>{email}</strong>. Expira em 10 min.</p>
            <div className="form-group">
              <label className="form-label">Código OTP</label>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input key={i} ref={el => { refs.current[i] = el }}
                    className={`otp-input${d ? ' filled' : ''}`}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    autoFocus={i === 0} />
                ))}
              </div>
              {error && <p className="error-msg" style={{ textAlign: 'center' }}>{error}</p>}
            </div>
            <button className="btn-primary" onClick={handleVerify}
              disabled={loading || otp.join('').length < 6}>
              {loading ? 'Criando conta…' : 'Verificar e criar conta'}
            </button>
            <div className="resend-row">
              Não recebeu?{' '}
              {cooldown > 0
                ? <span style={{ color: '#aaa' }}>Reenviar em {cooldown}s</span>
                : <button className="link-btn" onClick={handleResend} disabled={loading}>Reenviar código</button>}
            </div>
          </>}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
              <h1 className="auth-heading" style={{ textAlign: 'center' }}>Conta criada!</h1>
              <p className="auth-sub" style={{ textAlign: 'center' }}>
                Seja bem-vindo(a), <strong>{username}</strong>. Redirecionando…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
