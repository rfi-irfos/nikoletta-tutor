import { useState, useEffect } from 'react'
import './App.css'
import { useContent } from './hooks/useContent'
import { useAuth } from './hooks/useAuth'
import { useLang } from './hooks/useLang'
import { PublicSite } from './components/PublicSite'
import { AdminPanel } from './components/AdminPanel'
import { LoginPage } from './components/LoginPage'
import { LegalPage } from './components/LegalPage'

function getRoute(hash: string) {
  if (hash === '#admin' || hash.startsWith('#admin/')) return { isAdmin: true, legalSlug: null }
  if (hash.startsWith('#p/')) return { isAdmin: false, legalSlug: hash.slice(3) }
  return { isAdmin: false, legalSlug: null }
}

export default function App() {
  const { lang } = useLang()
  const { content, loading, saving, save, uploadImage } = useContent(lang)
  const { user, login, logout, lockSecondsRemaining } = useAuth()
  const [route, setRoute] = useState(() => getRoute(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(getRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!content) {
    return <div className="error-screen">Content could not be loaded.</div>
  }

  if (route.isAdmin) {
    if (!user) return <LoginPage onLogin={login} lockSecondsRemaining={lockSecondsRemaining} />
    return (
      <AdminPanel
        content={content}
        user={user}
        saving={saving}
        onSave={save}
        onUpload={uploadImage}
        onLogout={logout}
      />
    )
  }

  if (route.legalSlug) {
    return (
      <LegalPage
        slug={route.legalSlug}
        brand={content.nav?.brand}
        phone={content.contact?.phone}
        email={content.contact?.email}
        address={content.contact?.address}
      />
    )
  }

  return <PublicSite content={content} />
}
