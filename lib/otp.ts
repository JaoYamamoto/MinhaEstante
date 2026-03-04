/**
 * Utilitário de OTP – geração e verificação no lado do cliente.
 *
 * O código é armazenado em memória (sessionStorage) com TTL de 10 minutos.
 * Em produção com requisitos de segurança mais altos, mova a geração e
 * verificação para uma API Route do Next.js (app/api/otp/route.ts).
 */

const OTP_KEY = 'minha_estante_otp'
const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutos

interface StoredOtp {
  code: string
  email: string
  expiresAt: number
}

/** Gera um código numérico de 6 dígitos e o armazena na sessão. */
export function generateOtp(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const payload: StoredOtp = {
    code,
    email,
    expiresAt: Date.now() + OTP_TTL_MS,
  }
  sessionStorage.setItem(OTP_KEY, JSON.stringify(payload))
  return code
}

/** Verifica se o código informado é válido para o e-mail dado. */
export function verifyOtp(email: string, code: string): boolean {
  const raw = sessionStorage.getItem(OTP_KEY)
  if (!raw) return false

  try {
    const stored: StoredOtp = JSON.parse(raw)
    const valid =
      stored.email === email &&
      stored.code === code &&
      Date.now() < stored.expiresAt

    if (valid) sessionStorage.removeItem(OTP_KEY) // uso único
    return valid
  } catch {
    return false
  }
}

/** Remove qualquer OTP armazenado (ex.: ao reenviar). */
export function clearOtp(): void {
  sessionStorage.removeItem(OTP_KEY)
}
