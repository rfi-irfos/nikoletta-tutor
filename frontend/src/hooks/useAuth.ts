import { useState } from 'react'

export interface User { name: string; email: string; picture: string }

const SESSION_KEY = 'rfi_admin_ok'
const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined

export function useAuth() {
  const [user, setUser] = useState<User | null>(() =>
    sessionStorage.getItem(SESSION_KEY) ? { name: 'Admin', email: '', picture: '' } : null
  )

  const login = (password: string): boolean => {
    if (!ADMIN_PW || password !== ADMIN_PW) return false
    sessionStorage.setItem(SESSION_KEY, '1')
    setUser({ name: 'Admin', email: '', picture: '' })
    return true
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
    window.location.hash = ''
    window.location.href = '/'
  }

  return { user, loading: false, login, logout }
}
