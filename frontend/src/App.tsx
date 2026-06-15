import './App.css'
import { useContent } from './hooks/useContent'
import { useAuth } from './hooks/useAuth'
import { PublicSite } from './components/PublicSite'
import { AdminPanel } from './components/AdminPanel'
import { LoginPage } from './components/LoginPage'

// Hash-based admin route — works on any static host (GitHub Pages, etc.)
const isAdmin = window.location.hash === '#admin' || window.location.hash.startsWith('#admin/')

export default function App() {
  const { content, loading, saving, save, uploadImage } = useContent()
  const { user, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!content) {
    return <div className="error-screen">Inhalt konnte nicht geladen werden.</div>
  }

  if (isAdmin) {
    if (!user) return <LoginPage onLogin={login} />
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

  return <PublicSite content={content} />
}
