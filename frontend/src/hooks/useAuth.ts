import { useState } from 'react'
import { setGhToken, clearGhToken } from '../lib/github'

export interface User { name: string; email: string; picture: string }

const SESSION_KEY = 'rfi_admin_ok'
const PAT_KEY = 'rfi_gh_pat'
const ADMIN_HASH = import.meta.env.VITE_ADMIN_HASH as string

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) return null
    const pat = localStorage.getItem(PAT_KEY)
    if (!pat) {
      // Old session without PAT stored — force re-login so PAT can be collected
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    setGhToken(pat)
    return { name: 'Admin', email: '', picture: '' }
  })

  const login = async (password: string, pat?: string): Promise<boolean> => {
    if (!ADMIN_HASH) return false
    const hash = await sha256(password)
    if (hash !== ADMIN_HASH) return false

    const usePat = pat ?? localStorage.getItem(PAT_KEY) ?? ''
    if (usePat) {
      localStorage.setItem(PAT_KEY, usePat)
      setGhToken(usePat)
    }

    sessionStorage.setItem(SESSION_KEY, '1')
    setUser({ name: 'Admin', email: '', picture: '' })
    return true
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    clearGhToken()
    setUser(null)
    window.location.hash = ''
    window.location.href = '/'
  }

  return { user, loading: false, login, logout }
}
