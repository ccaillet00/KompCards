export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

export interface LoginResponse {
  token: string
  expiresInSeconds: number
  user: AuthUser
}

export interface RegisterResponse {
  user: AuthUser
}

export interface StoredAuthSession {
  token: string
  expiresAt: number
  user: AuthUser
}
