/**
 * Cliente HTTP para o backend Flask.
 * Todas as funções lançam Error com a mensagem do servidor em caso de falha.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean
  error?: string
  [key: string]: unknown
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string>,
): Promise<ApiResponse<T>> {
  const url = new URL(BASE_URL + path)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data: ApiResponse<T> = await res.json()

  if (!data.ok) {
    throw new Error(data.error ?? "Erro desconhecido.")
  }

  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserPublic {
  id: number
  email: string
  username: string
  created_at: string
}

/** Valida dados de cadastro no backend antes de enviar o OTP. */
export async function apiValidateRegister(
  email: string,
  username: string,
  password: string,
): Promise<void> {
  await request("POST", "/auth/register", { email, username, password })
}

/** Persiste o usuário após verificação OTP bem-sucedida. */
export async function apiCompleteRegister(
  email: string,
  username: string,
  password: string,
): Promise<UserPublic> {
  const data = await request("POST", "/auth/verify-otp", { email, username, password })
  return data.user as UserPublic
}

/** Autentica com e-mail + senha. */
export async function apiLogin(email: string, password: string): Promise<UserPublic> {
  const data = await request("POST", "/auth/login", { email, password })
  return data.user as UserPublic
}

/** Verifica em tempo real se e-mail já existe. */
export async function apiCheckEmail(email: string): Promise<boolean> {
  const data = await request("GET", "/auth/check-email", undefined, { email })
  return data.exists as boolean
}

/** Verifica em tempo real se username já existe. */
export async function apiCheckUsername(username: string): Promise<boolean> {
  const data = await request("GET", "/auth/check-username", undefined, { username })
  return data.exists as boolean
}
