import { useState } from 'react'
import { clearGhToken } from '../lib/github'

export interface User { name: string; email: string; picture: string }

const SESSION_KEY = 'rfi_admin_ok'
const FAIL_KEY = 'rfi_admin_fails'
const LOCK_KEY = 'rfi_admin_lockuntil'
const ADMIN_HASH = import.meta.env.VITE_ADMIN_HASH as string

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function getFailCount(): number { return parseInt(sessionStorage.getItem(FAIL_KEY) || '0', 10) }
function getLockUntil(): number { return parseInt(sessionStorage.getItem(LOCK_KEY) || '0', 10) }

export function useAuth() {
  const [user, setUser] = useState<User | null>(() =>
    localStorage.getItem(SESSION_KEY) ? { name: 'Admin', email: '', picture: '' } : null
  )

  const login = async (password: string): Promise<boolean | 'locked'> => {
    if (!ADMIN_HASH) return false

    const now = Date.now()
    const lockUntil = getLockUntil()
    if (now < lockUntil) return 'locked'

    const hash = await sha256(password)
    if (hash !== ADMIN_HASH) {
      const fails = getFailCount() + 1
      sessionStorage.setItem(FAIL_KEY, String(fails))
      const lockSecs = Math.min(300, Math.pow(2, fails - 1))
      sessionStorage.setItem(LOCK_KEY, String(Date.now() + lockSecs * 1000))
      return false
    }

    sessionStorage.removeItem(FAIL_KEY)
    sessionStorage.removeItem(LOCK_KEY)
    localStorage.setItem(SESSION_KEY, '1')
    setUser({ name: 'Admin', email: '', picture: '' })
    return true
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    clearGhToken()
    setUser(null)
    window.location.hash = ''
    window.location.href = import.meta.env.BASE_URL || '/'
  }

  const lockSecondsRemaining = (): number => {
    const remaining = getLockUntil() - Date.now()
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0
  }

  return { user, loading: false, login, logout, lockSecondsRemaining }
}
