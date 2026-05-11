const OTP_KEY    = "minha_estante_otp"
const OTP_TTL_MS = 10 * 60 * 1000

interface StoredOtp { code: string; email: string; expiresAt: number }

export function generateOtp(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  sessionStorage.setItem(OTP_KEY, JSON.stringify({ code, email, expiresAt: Date.now() + OTP_TTL_MS }))
  return code
}

export function verifyOtp(email: string, code: string): boolean {
  const raw = sessionStorage.getItem(OTP_KEY)
  if (!raw) return false
  try {
    const s: StoredOtp = JSON.parse(raw)
    const valid = s.email === email && s.code === code && Date.now() < s.expiresAt
    if (valid) sessionStorage.removeItem(OTP_KEY)
    return valid
  } catch { return false }
}

export function clearOtp() { sessionStorage.removeItem(OTP_KEY) }
