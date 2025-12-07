/**
 * Backend API response types
 * Matches the ApiResponse<T> format from the .NET backend
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  statusCode: number
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  apiKey: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}
