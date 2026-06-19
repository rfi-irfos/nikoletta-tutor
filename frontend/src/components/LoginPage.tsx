import { useState, useEffect } from 'react'

interface Props { onLogin: (pw: string) => Promise<boolean | 'locked'>; lockSecondsRemaining: () => number }

export function LoginPage({ onLogin, lockSecondsRemaining }: Props) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lockSecs, setLockSecs] = useState(() => lockSecondsRemaining())

  useEffect(() => {
    if (lockSecs <= 0) return
    const id = setInterval(() => {
      const rem = lockSecondsRemaining()
      setLockSecs(rem)
      if (rem <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [lockSecs > 0])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rem = lockSecondsRemaining()
    if (rem > 0) { setLockSecs(rem); return }
    setBusy(true)
    const ok = await onLogin(pw)
    setBusy(false)
    if (ok === 'locked' || !ok) {
      setError(true)
      setLockSecs(lockSecondsRemaining())
      setPw('')
    }
  }

  const isLocked = lockSecs > 0

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="#0099CC"/>
            <path d="M11 20h18M20 11v18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="login-title">Website Admin</h1>
        <p className="login-sub">Geben Sie Ihr Passwort ein.</p>
        <form onSubmit={submit} className="login-form">
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false) }}
            placeholder="Passwort"
            autoFocus
            disabled={isLocked || busy}
            className="login-pw-input"
          />
          {isLocked && (
            <p className="login-error">
              Zu viele Fehlversuche. Bitte warten: {lockSecs}s
            </p>
          )}
          {error && !isLocked && <p className="login-error">Falsches Passwort. Bitte nochmal.</p>}
          <button type="submit" disabled={busy || isLocked} className="login-submit-btn">
            {isLocked ? `Gesperrt (${lockSecs}s)` : busy ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
