export interface AuthUser {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

export interface AuthSession {
  expiresAt: Date | string
}
