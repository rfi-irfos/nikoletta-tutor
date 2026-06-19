import { useState, useRef, useEffect, useCallback } from 'react'
import type { SiteContent, ProductItem, NewsItem } from '../types/content'
import type { User } from '../hooks/useAuth'
import { PublicSite } from './PublicSite'
import { useStudents } from '../lib/useStudents'
import { useTestimonials } from '../lib/useTestimonials'
import type { Student } from '../types/students'
import type { Testimonial } from '../types/testimonials'
import { useLang } from '../hooks/useLang'

interface PendingReview {
  id: string
  name: string
  email: string
  language: string
  rating: number
  text: string
  submittedAt: string
}

function loadPending(): PendingReview[] {
  try { return JSON.parse(localStorage.getItem('niki_pending_reviews') || '[]') } catch { return [] }
}

interface ContactInboxItem {
  id: string
  name: string
  email: string
  phone: string
  message: string
  submittedAt: string
}

function loadContactInbox(): ContactInboxItem[] {
  try { return JSON.parse(localStorage.getItem('niki_contact_inbox') || '[]') } catch { return [] }
}

interface SSPReflection {
  timestamp: string
  teacher: { name: string; experience: string; languages: string }
  session: { setting: string; ageGroup: string[]; sessType: string; sessNum: string }
  student: { priorRel: string[]; groupFocus: string; selReason: string }
  tasks: string[]
  scores: { confidence: number; accuracy: number; languageRel: number; trust: number; nervousSystem: number }
  story: { notable: string; surprise: string; nowork: string }
}

function loadSSP(): SSPReflection[] {
  try { return JSON.parse(localStorage.getItem('ssp_reflections') || '[]') } catch { return [] }
}

const SCORE_KEYS: (keyof SSPReflection['scores'])[] = ['confidence', 'accuracy', 'languageRel', 'trust', 'nervousSystem']
const SCORE_LABELS = ['Confidence', 'Accuracy', 'Language', 'Trust', 'Nervous sys.']
const TASK_LABELS: Record<string, string> = {
  task1: 'Ask how they want to be taught',
  task2: 'Build session around casual mention',
  task3: 'Respond with full enthusiasm',
  task4: 'Use prepared pivot',
  task5: 'Track conf & acc separately',
}

function scoreColor(v: number) {
  const h = Math.round(200 - (v - 1) / 4 * 155)
  const s = Math.round(45 + (v - 1) / 4 * 25)
  return `hsl(${h},${s}%,52%)`
}

function SSPMiniBar({ scores }: { scores: SSPReflection['scores'] }) {
  const vals = SCORE_KEYS.map(k => scores[k])
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 36, marginTop: 6 }}>
      {vals.map((v, i) => (
        <div key={i} title={`${SCORE_LABELS[i]}: ${v}/5`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 16, height: v / 5 * 30, background: scoreColor(v), borderRadius: 3 }} />
          <span style={{ fontSize: 8, color: '#aaa', lineHeight: 1 }}>{SCORE_LABELS[i].slice(0, 4)}</span>
        </div>
      ))}
    </div>
  )
}

function SSPAggregateBars({ reflections }: { reflections: SSPReflection[] }) {
  if (reflections.length === 0) return null
  const avgs = SCORE_KEYS.map(k => {
    const sum = reflections.reduce((a, r) => a + (r.scores[k] ?? 0), 0)
    return sum / reflections.length
  })
  const maxW = 200
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      {avgs.map((avg, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 80, fontSize: 11, color: '#666', fontWeight: 500 }}>{SCORE_LABELS[i]}</span>
          <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 10, maxWidth: maxW }}>
            <div style={{ width: `${(avg / 5) * 100}%`, height: '100%', background: scoreColor(avg), borderRadius: 4, transition: 'width .4s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(avg), minWidth: 28 }}>{avg.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  content: SiteContent
  user: User
  saving: boolean
  onSave: (c: SiteContent) => Promise<boolean>
  onUpload: (f: File) => Promise<string | null>
  onLogout: () => void
}

type PanelTab = 'products' | 'hero' | 'about' | 'usp' | 'news' | 'contact' | 'style' | 'students' | 'reviews' | 'pricing' | 'ssp'
type DeviceView = 'edit' | 'desktop' | 'tablet' | 'mobile'

// ── Device preview switch (Edit / Desktop / Tablet / Mobile) ──────────────────

function IconEdit() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
}
function IconDesktop() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
}
function IconTablet() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
}
function IconMobile() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
}

const DEVICE_OPTS: { id: DeviceView; label: string; icon: React.ReactNode }[] = [
  { id: 'edit', label: 'Bearbeiten', icon: <IconEdit /> },
  { id: 'desktop', label: 'Web', icon: <IconDesktop /> },
  { id: 'tablet', label: 'Tablet', icon: <IconTablet /> },
  { id: 'mobile', label: 'Mobil', icon: <IconMobile /> },
]

export function AdminPanel({ content, user: _user, saving, onSave, onUpload, onLogout }: Props) {
  const [draft, setDraft] = useState<SiteContent>(content)
  const [activeTab, setActiveTab] = useState<PanelTab>('products')
  const { students, saving: studentsSaving, add: addStudent, update: updateStudent, remove: removeStudent } = useStudents()
  const { testimonials, saving: reviewsSaving, add: addReview, update: updateReview, remove: removeReview } = useTestimonials()
  const [editingReview, setEditingReview] = useState<Testimonial | null>(null)
  const [newReviewForm, setNewReviewForm] = useState(false)
  const [reviewDraft, setReviewDraft] = useState<Partial<Testimonial>>({})
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudentForm, setNewStudentForm] = useState(false)
  const [studentDraft, setStudentDraft] = useState<Partial<Student>>({})
  const { lang, setLang } = useLang()

  // When the editing language switches, the parent refetches that language's
  // content. Re-seed the local draft so the panel edits the right document.
  useEffect(() => { setDraft(content) }, [content])
  const [saved, setSaved] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editingNews, setEditingNews] = useState<string | null>(null)
  const [specsInput, setSpecsInput] = useState('')
  const [panelWidth, setPanelWidth] = useState(380)
  const [device, setDevice] = useState<DeviceView>(() => {
    const p = new URLSearchParams(window.location.search)
    const v = p.get('view')
    if (v === 'mobile' || v === 'tablet' || v === 'desktop' || v === 'edit') return v as DeviceView
    return 'edit'
  })
  const [adminMode, setAdminMode] = useState(false)
  const [adminSection, setAdminSection] = useState<'reviews' | 'students' | 'inbox' | 'research' | 'fragebogen'>('inbox')
  const [sspReflections, setSspReflections] = useState<SSPReflection[]>(() => loadSSP())
  const [sspExpanded, setSspExpanded] = useState<string | null>(null)
  const [sspFormVersions, setSspFormVersions] = useState<{id:string,ts:string,label:string,notes:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('ssp_form_versions') || '[]') } catch { return [] }
  })
  const [fragebogenLabel, setFragebogenLabel] = useState('')
  const [fragebogenNotes, setFragebogenNotes] = useState('')
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>(loadPending)
  const [contactInbox, setContactInbox] = useState<ContactInboxItem[]>(loadContactInbox)

  const removePending = useCallback((id: string) => {
    setPendingReviews(prev => {
      const next = prev.filter(r => r.id !== id)
      localStorage.setItem('niki_pending_reviews', JSON.stringify(next))
      return next
    })
  }, [])

  const removeInboxItem = useCallback((id: string) => {
    setContactInbox(prev => {
      const next = prev.filter(r => r.id !== id)
      localStorage.setItem('niki_contact_inbox', JSON.stringify(next))
      return next
    })
  }, [])
  const fileRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // reset the specs tag input whenever a different session opens
  useEffect(() => { setSpecsInput('') }, [editingProduct])

  // drag-resize the right settings panel (380–620px)
  const startPanelResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX, startW = panelWidth
    const onMove = (ev: MouseEvent) => setPanelWidth(Math.max(320, Math.min(640, startW + (startX - ev.clientX))))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  // ── Init positions snapshot for canvas ────────────────────────────────────

  const [initPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (!previewRef.current) return {}
    return {}
  })

  // ── Canvas click → sidebar auto-navigate ─────────────────────────────────

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Double-click = text selection intent, never navigate
    if (e.detail >= 2) return
    // Don't intercept clicks when already actively editing an element
    const target = e.target as HTMLElement
    if (target.isContentEditable && document.activeElement === target) return
    const el = target.closest('[data-cid]') as HTMLElement | null
    if (!el) return
    const cid = el.dataset.cid ?? ''
    if (cid.startsWith('about.')) {
      setActiveTab('about')
    } else if (cid.startsWith('hero.') || cid.startsWith('nav.') || cid.startsWith('trust.')) {
      setActiveTab('hero')
    } else if (cid.startsWith('products.items.')) {
      const idx = parseInt(cid.split('.')[2])
      const item = draft.products?.items?.[idx]
      if (item) { setActiveTab('products'); setEditingProduct(item.id) }
    } else if (cid.startsWith('products.') || cid.startsWith('categories.')) {
      setActiveTab('products')
    } else if (cid.startsWith('news.items.')) {
      const idx = parseInt(cid.split('.')[2])
      const item = draft.news?.items?.[idx]
      if (item) { setActiveTab('news'); setEditingNews(item.id) }
    } else if (cid.startsWith('news.')) {
      setActiveTab('news')
    } else if (cid.startsWith('contact.') || cid.startsWith('whatsapp.')) {
      setActiveTab('contact')
    } else if (cid.startsWith('usp.')) {
      setActiveTab('usp')
    } else if (cid.startsWith('pricing.') || cid.startsWith('certificates.')) {
      setActiveTab('pricing')
    } else if (cid.startsWith('ssp.')) {
      setActiveTab('ssp')
    } else if (cid.startsWith('meta.') || cid.startsWith('footer.')) {
      setActiveTab('style')
    }
  }

  // ── State helpers ─────────────────────────────────────────────────────────

  const update = (path: string, value: unknown) => {
    const keys = path.split('.')
    setDraft(prev => {
      const next = structuredClone(prev) as unknown as Record<string, unknown>
      let cur = next
      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]] as Record<string, unknown>
      }
      cur[keys[keys.length - 1]] = value
      return next as unknown as SiteContent
    })
  }

  const handleSave = async () => {
    const ok = await onSave(draft)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  const handleImageClick = (field: string) => {
    setUploadTarget(field)
    fileRef.current?.click()
  }

  // ── Product helpers ───────────────────────────────────────────────────────

  const addProduct = () => {
    const id = `p${Date.now()}`
    const cat = draft.products?.tabs?.find(t => t !== 'Alle') ?? (lang === 'de' ? 'Englisch' : 'English')
    const tmpl = lang === 'de'
      ? {
          name: 'Neue Stunde',
          description: 'Beschreibe diese Stunde in ein, zwei Sätzen. Für wen ist sie, was nimmt man mit, und was macht deinen Ansatz besonders?',
          price: 'Auf Anfrage',
          specs: ['Einzeln oder Kleingruppe', 'Online oder in Graz', 'Flexible Termine'],
        }
      : {
          name: 'New session',
          description: 'Describe this session in a sentence or two. Who is it for, what will they walk away with, and what makes your approach different?',
          price: 'On request',
          specs: ['1-on-1 or small group', 'Online or in Graz', 'Flexible scheduling'],
        }
    const newProduct: ProductItem = { id, name: tmpl.name, description: tmpl.description, price: tmpl.price, image: '', category: cat, specs: tmpl.specs }
    update('products.items', [...(draft.products?.items ?? []), newProduct])
    setEditingProduct(id)
  }

  const deleteProduct = (id: string) => {
    update('products.items', draft.products.items.filter(p => p.id !== id))
    if (editingProduct === id) setEditingProduct(null)
  }

  const updateProduct = (id: string, field: keyof ProductItem, value: unknown) => {
    update('products.items', draft.products.items.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const uploadProductImage = async (id: string) => {
    setUploadTarget(`product:${id}`)
    fileRef.current?.click()
  }

  // ── News helpers ──────────────────────────────────────────────────────────

  const addNews = () => {
    const id = `n${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    const tmpl = lang === 'de'
      ? {
          title: 'Neuer Blogbeitrag',
          body: 'Schreib hier deinen Beitrag. Erzähl eine Geschichte aus einer Stunde, einen Tipp für Lernende oder einen Gedanken zum Sprachenlernen. Ein paar warme, ehrliche Absätze wirken am besten.',
        }
      : {
          title: 'New blog post',
          body: 'Write your post here. Share a story from a lesson, a tip for learners, or a thought about language learning. A few warm, honest paragraphs work best.',
        }
    const newItem: NewsItem = { id, date: today, title: tmpl.title, body: tmpl.body, image: '' }
    update('news.items', [...(draft.news?.items ?? []), newItem])
    setEditingNews(id)
  }

  const deleteNews = (id: string) => {
    update('news.items', draft.news.items.filter(n => n.id !== id))
    if (editingNews === id) setEditingNews(null)
  }

  const updateNews = (id: string, field: keyof NewsItem, value: string) => {
    update('news.items', draft.news.items.map(n => n.id === id ? { ...n, [field]: value } : n))
  }

  // Custom file handler that can handle product image uploads
  const handleFileChangeAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    setUploading(true)
    const url = await onUpload(file)
    if (url) {
      if (uploadTarget.startsWith('product:')) {
        const pid = uploadTarget.replace('product:', '')
        updateProduct(pid, 'image', url)
      } else if (uploadTarget.startsWith('news:')) {
        const nid = uploadTarget.replace('news:', '')
        updateNews(nid, 'image', url)
      } else if (uploadTarget.startsWith('cert:')) {
        const cid = uploadTarget.replace('cert:', '')
        update('certificates.items', (draft.certificates?.items ?? []).map(c => c.id === cid ? { ...c, file: url } : c))
      } else {
        update(uploadTarget, url)
      }
    }
    setUploading(false)
    e.target.value = ''
    setUploadTarget(null)
  }

  const uploadNewsImage = async (id: string) => {
    setUploadTarget(`news:${id}`)
    fileRef.current?.click()
  }

  const tabs: Array<{ id: PanelTab; label: string }> = [
    { id: 'products', label: 'Sessions' },
    { id: 'hero',     label: 'Hero' },
    { id: 'about',    label: 'Über mich' },
    { id: 'usp',      label: 'Mein Ansatz' },
    { id: 'news',     label: 'Blog' },
    { id: 'pricing',  label: 'Preise & Zertifikate' },
    { id: 'ssp',      label: 'Forschungsportal' },
    { id: 'contact',  label: 'Kontakt' },
    { id: 'style',    label: 'Stil' },
  ]

  const editingProd = editingProduct ? draft.products?.items?.find(p => p.id === editingProduct) : null
  const editingNewsItem = editingNews ? draft.news?.items?.find(n => n.id === editingNews) : null

  return (
    <div className="builder">
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChangeAll} />

      {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
      <div className="builder-topbar">
        <div className="builder-brand">
          <span className="builder-brand-dot" />
          <strong>{draft.nav?.brand || 'My website'}</strong>
          <span className="builder-lang-switch" role="group" aria-label="Editing language">
            <button type="button" className={`builder-lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button type="button" className={`builder-lang-btn ${lang === 'de' ? 'active' : ''}`} onClick={() => setLang('de')}>DE</button>
            <button type="button" className={`builder-lang-btn ${lang === 'hu' ? 'active' : ''}`} onClick={() => setLang('hu')}>HU</button>
          </span>
        </div>
        <div className="builder-device-switch" role="group" aria-label="Ansicht wählen">
          {DEVICE_OPTS.map(d => (
            <button
              key={d.id}
              type="button"
              className={`builder-device-btn ${device === d.id ? 'active' : ''}`}
              aria-pressed={device === d.id}
              title={d.id === 'edit' ? 'Canvas bearbeiten' : `${d.label}-Vorschau`}
              onClick={() => setDevice(d.id)}
            >
              {d.icon}
              {d.label}
            </button>
          ))}
        </div>
        <div className="builder-topbar-right">
          <button
            className={`builder-btn-ghost ${adminMode ? 'active' : ''}`}
            onClick={() => { setAdminMode(m => !m); setPendingReviews(loadPending()); setContactInbox(loadContactInbox()) }}
            title="Verwaltung: Anfragen, Bewertungen & Schüler"
            style={{ position: 'relative' }}
          >
            Verwaltung
            {(pendingReviews.length + contactInbox.length) > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -6, background: '#e53e3e', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {pendingReviews.length + contactInbox.length}
              </span>
            )}
          </button>
          <button
            className={`builder-save-btn-top ${saving ? 'loading' : ''} ${saved ? 'done' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Speichern…' : saved ? 'Gespeichert' : 'Speichern'}
          </button>
          <a
            className="builder-btn-ghost"
            href={window.location.origin + import.meta.env.BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Website im neuen Tab öffnen"
          >↗ Website</a>
          <button className="builder-btn-ghost" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      {adminMode ? (

        /* ── ADMIN FULL-PAGE VIEW ───────────────────────────────────────── */
        <div className="crm-layout">

          {/* ── CRM SIDEBAR ── */}
          <aside className="crm-sidebar">
            <div className="crm-sidebar-brand">
              <span className="crm-sidebar-icon">N</span>
              <div>
                <div className="crm-sidebar-name">Niki's Studio</div>
                <div className="crm-sidebar-sub">Verwaltung</div>
              </div>
            </div>

            <nav className="crm-nav">
              <button className={`crm-nav-item ${adminSection === 'inbox' ? 'active' : ''}`} onClick={() => setAdminSection('inbox')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Anfragen
                {contactInbox.length > 0 && <span className="crm-badge red">{contactInbox.length}</span>}
              </button>
              <button className={`crm-nav-item ${adminSection === 'students' ? 'active' : ''}`} onClick={() => setAdminSection('students')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Schüler
                {students.filter(s => s.status === 'active').length > 0 && <span className="crm-badge teal">{students.filter(s => s.status === 'active').length}</span>}
              </button>
              <button className={`crm-nav-item ${adminSection === 'reviews' ? 'active' : ''}`} onClick={() => setAdminSection('reviews')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Reviews
                {pendingReviews.length > 0 && <span className="crm-badge red">{pendingReviews.length}</span>}
              </button>
              <button className={`crm-nav-item ${adminSection === 'research' ? 'active' : ''}`} onClick={() => { setSspReflections(loadSSP()); setAdminSection('research') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                Forschung
                {sspReflections.length > 0 && <span className="crm-badge gold">{sspReflections.length}</span>}
              </button>
              <button className={`crm-nav-item ${adminSection === 'fragebogen' ? 'active' : ''}`} onClick={() => setAdminSection('fragebogen')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Fragebogen
                <span className="crm-badge teal">{sspFormVersions.length > 0 ? `v${sspFormVersions.length}` : 'v1'}</span>
              </button>
            </nav>

            <div className="crm-sidebar-stats">
              <div className="crm-stat-row">
                <div className="crm-stat-box">
                  <span className="crm-stat-num">{students.filter(s => s.status === 'active').length}</span>
                  <span className="crm-stat-lbl">Aktive Schüler</span>
                </div>
                <div className="crm-stat-box">
                  <span className="crm-stat-num">{contactInbox.length + pendingReviews.length}</span>
                  <span className="crm-stat-lbl">Offen</span>
                </div>
              </div>
              <div className="crm-stat-row">
                <div className="crm-stat-box">
                  <span className="crm-stat-num">{students.reduce((a, s) => a + (s.sessions || 0), 0)}</span>
                  <span className="crm-stat-lbl">Ges. Stunden</span>
                </div>
                <div className="crm-stat-box">
                  <span className="crm-stat-num" style={{ color: '#B8975A' }}>{sspReflections.length}</span>
                  <span className="crm-stat-lbl">Reflexionen</span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── CRM MAIN ── */}
          <div className="crm-main">
            <div className="crm-topbar">
              <div className="crm-topbar-title">
                {adminSection === 'inbox' ? 'Anfragen' : adminSection === 'students' ? 'Schüler' : adminSection === 'reviews' ? 'Reviews' : adminSection === 'fragebogen' ? 'Fragebogen' : 'Forschung'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {adminSection === 'inbox' && contactInbox.length > 0 && <span style={{ fontSize: 12, color: '#888' }}>{contactInbox.length} Nachricht{contactInbox.length !== 1 ? 'en' : ''}</span>}
                {adminSection === 'students' && <span style={{ fontSize: 12, color: '#888' }}>{students.length} Schüler gesamt</span>}
                {adminSection === 'reviews' && <span style={{ fontSize: 12, color: '#888' }}>{pendingReviews.length} ausstehend</span>}
                {adminSection === 'research' && <span style={{ fontSize: 12, color: '#888' }}>{sspReflections.length} Einträge</span>}
                {adminSection === 'fragebogen' && <span style={{ fontSize: 12, color: '#888' }}>{sspFormVersions.length} Version{sspFormVersions.length !== 1 ? 'en' : ''}</span>}
              </div>
            </div>
          <div className="crm-body">

            {/* ── ANFRAGEN (CONTACT INBOX) ─────────────────────────── */}
            {adminSection === 'inbox' && (
              <div className="panel-products">
                {contactInbox.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--panel-muted,#888)', fontSize: 13, padding: '40px 0' }}>
                    Noch keine Anfragen eingegangen.
                  </div>
                ) : contactInbox.map(item => (
                  <div key={item.id} style={{ background: 'var(--panel-surface,#f8f8f8)', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid var(--panel-border,#e8e8e8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</span>
                      <span style={{ fontSize: 10, color: '#999' }}>{new Date(item.submittedAt).toLocaleString('de')}</span>
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      <a href={`mailto:${item.email}`} style={{ color: '#0099CC', textDecoration: 'none' }}>{item.email}</a>
                      {item.phone && <span style={{ color: '#666', marginLeft: 10 }}>{item.phone}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: '#333', margin: '8px 0 12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`mailto:${item.email}?subject=Re: Trial lesson&body=Hi ${item.name},%0A%0A`}
                        style={{ background: '#0099CC', color: '#fff', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                        Antworten
                      </a>
                      <button onClick={() => removeInboxItem(item.id)}
                        style={{ background: 'none', border: '1px solid #bbb', color: '#666', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Erledigt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── REVIEWS ──────────────────────────────────────────────── */}
            {adminSection === 'reviews' && (
              <div className="panel-products">

                {/* Pending (eingegangen via Formular) */}
                {pendingReviews.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#0099CC' }}>
                      Eingegangen ({pendingReviews.length})
                    </div>
                    {pendingReviews.map(r => (
                      <div key={r.id} style={{ background: '#f0f8ff', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid #bee3f8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                            <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>{r.rating}/5</span>
                            {r.language && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{r.language}</span>}
                          </div>
                          <span style={{ fontSize: 10, color: '#999' }}>{new Date(r.submittedAt).toLocaleDateString('de')}</span>
                        </div>
                        <p style={{ fontSize: 13, margin: '8px 0 4px', color: '#333', lineHeight: 1.5 }}>{r.text}</p>
                        <div style={{ fontSize: 11, color: '#777', marginBottom: 10 }}>{r.email}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              addReview({ name: r.name, language: r.language, rating: r.rating, text: r.text, date: r.submittedAt.split('T')[0] })
                              removePending(r.id)
                            }}
                            style={{ background: '#0099CC', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >Genehmigen</button>
                          <button
                            onClick={() => removePending(r.id)}
                            style={{ background: 'none', border: '1px solid #d44', color: '#d44', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >Ablehnen</button>
                        </div>
                      </div>
                    ))}
                    <hr style={{ border: 'none', borderTop: '1px solid var(--panel-border,#e8e8e8)', margin: '0 0 16px' }} />
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--panel-muted,#888)', marginBottom: 10, lineHeight: 1.5, background: 'var(--panel-surface,#f8f8f8)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--panel-border,#e8e8e8)' }}>
                  Neue Bewertungen kommen per E-Mail an <strong>nikoletta.tutor@gmail.com</strong>. Klick auf <strong>+ Bewertung hinzufugen</strong> und trag sie hier ein — dann erscheinen sie sofort auf der Website.
                </div>

                {/* New review form */}
                {newReviewForm && (
                  <div style={{ background: 'var(--panel-surface,#f8f8f8)', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid var(--panel-border,#e8e8e8)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Neue Bewertung</div>
                    {(['name','language','text'] as (keyof Testimonial)[]).map(f => (
                      <div key={f} style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{{ name: 'Name', language: 'Sprache', text: 'Text' }[f as string] ?? f}</label>
                        {f === 'text'
                          ? <textarea rows={3} value={(reviewDraft[f] as string) ?? ''} onChange={e => setReviewDraft(d => ({ ...d, [f]: e.target.value }))} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '6px 8px', fontSize: 12, resize: 'vertical' }} />
                          : <input value={(reviewDraft[f] as string) ?? ''} onChange={e => setReviewDraft(d => ({ ...d, [f]: e.target.value }))} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '6px 8px', fontSize: 12 }} />
                        }
                      </div>
                    ))}
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>Sterne (1–5)</label>
                      <input type="number" min={1} max={5} value={reviewDraft.rating ?? 5} onChange={e => setReviewDraft(d => ({ ...d, rating: Math.min(5, Math.max(1, parseInt(e.target.value) || 5)) }))} style={{ width: 60, borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '6px 8px', fontSize: 12 }} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>Datum</label>
                      <input type="date" value={reviewDraft.date ?? new Date().toISOString().slice(0,10)} onChange={e => setReviewDraft(d => ({ ...d, date: e.target.value }))} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '6px 8px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="panel-add-btn" disabled={!reviewDraft.name || !reviewDraft.text || reviewsSaving}
                        onClick={() => { addReview({ name: reviewDraft.name!, language: reviewDraft.language ?? '', rating: reviewDraft.rating ?? 5, text: reviewDraft.text!, date: reviewDraft.date ?? new Date().toISOString().slice(0,10) }); setNewReviewForm(false); setReviewDraft({}) }}>
                        {reviewsSaving ? 'Speichern…' : 'Speichern'}
                      </button>
                      <button className="panel-back-btn" onClick={() => { setNewReviewForm(false); setReviewDraft({}) }}>Abbrechen</button>
                    </div>
                  </div>
                )}

                {/* Reviews list */}
                <div className="panel-product-list">
                  {testimonials.length === 0 && !newReviewForm && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--panel-muted,#aaa)', fontSize: 13 }}>Noch keine Bewertungen genehmigt.</div>
                  )}
                  {testimonials.map(r => (
                    <div key={r.id} style={{ background: 'var(--panel-surface,#f8f8f8)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid var(--panel-border,#e8e8e8)' }}>
                      {editingReview?.id === r.id ? (
                        <div>
                          {(['name','language','text'] as (keyof Testimonial)[]).map(f => (
                            <div key={f} style={{ marginBottom: 7 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{{ name: 'Name', language: 'Sprache', text: 'Text' }[f as string] ?? f}</label>
                              {f === 'text'
                                ? <textarea rows={3} value={(editingReview[f] as string) ?? ''} onChange={e => setEditingReview(d => d ? ({ ...d, [f]: e.target.value } as Testimonial) : null)} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '5px 8px', fontSize: 12, resize: 'vertical' }} />
                                : <input value={(editingReview[f] as string) ?? ''} onChange={e => setEditingReview(d => d ? ({ ...d, [f]: e.target.value } as Testimonial) : null)} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '5px 8px', fontSize: 12 }} />
                              }
                            </div>
                          ))}
                          <div style={{ marginBottom: 7 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Sterne</label>
                            <input type="number" min={1} max={5} value={editingReview.rating} onChange={e => setEditingReview(d => d ? ({ ...d, rating: Math.min(5, Math.max(1, parseInt(e.target.value) || 5)) } as Testimonial) : null)} style={{ width: 60, borderRadius: 6, border: '1px solid var(--panel-border,#e0e0e0)', padding: '5px 8px', fontSize: 12 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button className="panel-add-btn" disabled={reviewsSaving} onClick={() => { updateReview(r.id, editingReview!); setEditingReview(null) }}>{reviewsSaving ? 'Speichern…' : 'Speichern'}</button>
                            <button className="panel-back-btn" onClick={() => setEditingReview(null)}>Abbrechen</button>
                            <button className="panel-delete-btn" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm(`Bewertung von "${r.name}" löschen?`)) { removeReview(r.id); setEditingReview(null) } }}>Löschen</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                              {r.language && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--panel-border,#e8e8e8)', color: 'var(--panel-muted,#888)' }}>{r.language}</span>}
                              <span style={{ fontSize: 11, color: '#f59e0b', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--panel-muted,#888)', lineHeight: 1.5 }}>{r.text.slice(0, 100)}{r.text.length > 100 ? '…' : ''}</div>
                          </div>
                          <button className="panel-back-btn" style={{ fontSize: 11, padding: '3px 10px', flexShrink: 0 }} onClick={() => setEditingReview({ ...r })}>Bearbeiten</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button className="panel-add-big-btn" onClick={() => { setNewReviewForm(true); setReviewDraft({ rating: 5, date: new Date().toISOString().slice(0,10) }) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Bewertung hinzufügen
                </button>
              </div>
            )}

            {/* ── STUDENTS ─────────────────────────────────────────────── */}
            {adminSection === 'students' && (
              <div className="panel-students">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--panel-muted, #888)', fontWeight: 600 }}>{students.length} Schüler</span>
                  <button className="panel-add-btn" onClick={() => { setNewStudentForm(true); setStudentDraft({ status: 'active', language: 'Englisch', level: 'B1', sessions: 0, goal: '', notes: '' }) }}>
                    + Schüler hinzufügen
                  </button>
                </div>

                {newStudentForm && (
                  <div className="panel-student-form" style={{ background: 'var(--panel-surface, #f8f8f8)', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid var(--panel-border, #e8e8e8)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Neuer Schüler</div>
                    {(['name', 'language', 'level', 'goal', 'notes', 'next_session'] as (keyof Student)[]).map(f => (
                      <div key={f} style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{({'name': 'Name', 'language': 'Sprache', 'level': 'Niveau', 'goal': 'Ziel', 'notes': 'Notizen', 'next_session': 'Nächste Stunde'} as Record<string,string>)[f as string] ?? f}</label>
                        {f === 'notes' || f === 'goal'
                          ? <textarea rows={2} value={(studentDraft[f] as string) ?? ''} onChange={e => setStudentDraft(d => ({ ...d, [f]: e.target.value }))} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border, #e0e0e0)', padding: '6px 8px', fontSize: 12, resize: 'vertical' }} />
                          : <input value={(studentDraft[f] as string) ?? ''} onChange={e => setStudentDraft(d => ({ ...d, [f]: e.target.value }))} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border, #e0e0e0)', padding: '6px 8px', fontSize: 12 }} />
                        }
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="panel-add-btn" disabled={!studentDraft.name} onClick={() => { addStudent(studentDraft as Omit<Student, 'id' | 'since'>); setNewStudentForm(false); setStudentDraft({}) }}>
                        {studentsSaving ? 'Speichern…' : 'Speichern'}
                      </button>
                      <button className="panel-back-btn" onClick={() => { setNewStudentForm(false); setStudentDraft({}) }}>Abbrechen</button>
                    </div>
                  </div>
                )}

                {students.length === 0 && !newStudentForm && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--panel-muted, #aaa)', fontSize: 13 }}>
                    Noch keine Schüler. Füge deinen ersten oben hinzu.
                  </div>
                )}

                {students.map(s => (
                  <div key={s.id} style={{ background: 'var(--panel-surface, #f8f8f8)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid var(--panel-border, #e8e8e8)' }}>
                    {editingStudent?.id === s.id ? (
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Bearbeiten: {s.name}</div>
                        {(['name', 'language', 'level', 'status', 'sessions', 'next_session', 'goal', 'notes'] as (keyof Student)[]).map(f => (
                          <div key={f} style={{ marginBottom: 7 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{({'name': 'Name', 'language': 'Sprache', 'level': 'Niveau', 'status': 'Status', 'sessions': 'Stunden', 'next_session': 'Nächste Stunde', 'goal': 'Ziel', 'notes': 'Notizen'} as Record<string,string>)[f as string] ?? f}</label>
                            {f === 'status'
                              ? <select value={editingStudent[f] as string} onChange={e => setEditingStudent(d => d ? ({ ...d, [f]: e.target.value } as Student) : null)} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border, #e0e0e0)', padding: '5px 8px', fontSize: 12 }}>
                                  <option value="active">Aktiv</option>
                                  <option value="paused">Pausiert</option>
                                  <option value="completed">Abgeschlossen</option>
                                </select>
                              : f === 'notes' || f === 'goal'
                              ? <textarea rows={2} value={(editingStudent[f] as string) ?? ''} onChange={e => setEditingStudent(d => d ? ({ ...d, [f]: e.target.value } as Student) : null)} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border, #e0e0e0)', padding: '5px 8px', fontSize: 12, resize: 'vertical' }} />
                              : <input value={(editingStudent[f] as string | number) ?? ''} onChange={e => setEditingStudent(d => d ? ({ ...d, [f]: f === 'sessions' ? parseInt(e.target.value) || 0 : e.target.value } as Student) : null)} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--panel-border, #e0e0e0)', padding: '5px 8px', fontSize: 12 }} />
                            }
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="panel-add-btn" onClick={() => { updateStudent(s.id, editingStudent!); setEditingStudent(null) }} disabled={studentsSaving}>{studentsSaving ? 'Speichern…' : 'Speichern'}</button>
                          <button className="panel-back-btn" onClick={() => setEditingStudent(null)}>Abbrechen</button>
                          <button className="panel-delete-btn" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm(`${s.name} entfernen?`)) { removeStudent(s.id); setEditingStudent(null) } }}>Entfernen</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--panel-muted, #888)', marginBottom: 4 }}>{s.language} · {s.level} · {s.sessions} Stunden{s.next_session ? ` · nächste: ${s.next_session}` : ''}</div>
                          {s.goal && <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--panel-muted, #999)', marginBottom: 2 }}>Ziel: {s.goal}</div>}
                          {s.notes && <div style={{ fontSize: 11, color: 'var(--panel-muted, #aaa)' }}>{s.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: s.status === 'active' ? '#E8F5E8' : s.status === 'paused' ? '#FFF8E8' : '#F0F0F0', color: s.status === 'active' ? '#3A7A3A' : s.status === 'paused' ? '#9A7A10' : '#888' }}>{{ active: 'Aktiv', paused: 'Pausiert', completed: 'Abgeschl.' }[s.status] ?? s.status}</span>
                          <button className="panel-back-btn" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setEditingStudent({ ...s })}>Bearbeiten</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── FORSCHUNG (SSP RESEARCH) ───────────────────────────────── */}
            {adminSection === 'research' && (
              <div className="panel-products">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Silent Student Project</div>
                    <div style={{ fontSize: 12, color: 'var(--panel-muted,#888)' }}>{sspReflections.length} Reflexion{sspReflections.length !== 1 ? 'en' : ''} eingegangen</div>
                  </div>
                  <button className="panel-back-btn" onClick={() => { setSspReflections(loadSSP()) }}>↺ Aktualisieren</button>
                </div>

                {sspReflections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--panel-muted,#aaa)', fontSize: 13 }}>
                    Noch keine Reflexionen eingegangen. Teile den Portal-Link mit deinen Teilnehmer:innen.<br />
                    <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>Teilnehmer-Code: <strong>ssp2026</strong></span>
                  </div>
                ) : (
                  <>
                    {/* Aggregate overview */}
                    <div style={{ background: 'linear-gradient(135deg,#2C3830,#3D4A40)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
                      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#B8975A', marginBottom: 12, fontWeight: 600 }}>Gesamtübersicht</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#B8975A' }}>{sspReflections.length}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)' }}>Reflexionen</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#B8975A' }}>
                            {new Set(sspReflections.map(r => r.teacher?.name || 'anon')).size}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)' }}>Teilnehmer:innen</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#B8975A' }}>
                            {(SCORE_KEYS.reduce((sum, k) => sum + sspReflections.reduce((a, r) => a + (r.scores?.[k] ?? 0), 0) / sspReflections.length, 0) / 5).toFixed(1)}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)' }}>Ø Score</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginBottom: 8 }}>Durchschnitt je Dimension</div>
                      <SSPAggregateBars reflections={sspReflections} />
                    </div>

                    {/* Task frequency */}
                    <div style={{ background: 'var(--panel-surface,#f8f8f8)', borderRadius: 10, padding: '14px 18px', marginBottom: 16, border: '1px solid var(--panel-border,#e8e8e8)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--panel-muted,#666)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Methoden angewendet</div>
                      {Object.entries(TASK_LABELS).map(([key, label]) => {
                        const count = sspReflections.filter(r => r.tasks?.includes(key)).length
                        const pct = Math.round((count / sspReflections.length) * 100)
                        return (
                          <div key={key} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: '#444' }}>{label}</span>
                              <span style={{ fontWeight: 700, color: '#B8975A' }}>{count}×</span>
                            </div>
                            <div style={{ background: '#e8e8e8', borderRadius: 3, height: 5 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#B8975A', borderRadius: 3 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Individual entries */}
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--panel-muted,#666)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      Alle Einträge ({sspReflections.length})
                    </div>
                    {[...sspReflections].reverse().map((r, i) => {
                      const id = r.timestamp + i
                      const open = sspExpanded === id
                      const avgScore = SCORE_KEYS.reduce((a, k) => a + (r.scores?.[k] ?? 0), 0) / 5
                      return (
                        <div key={id} style={{ background: 'var(--panel-surface,#f8f8f8)', borderRadius: 10, marginBottom: 10, border: '1px solid var(--panel-border,#e8e8e8)', overflow: 'hidden' }}>
                          <button
                            onClick={() => setSspExpanded(open ? null : id)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{r.teacher?.name || 'Anonym'}</div>
                              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                                {r.teacher?.experience} · {r.teacher?.languages} · {r.session?.setting?.replace(/_/g, ' ')}
                              </div>
                            </div>
                            <SSPMiniBar scores={r.scores} />
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(avgScore) }}>{avgScore.toFixed(1)}</div>
                              <div style={{ fontSize: 9, color: '#aaa' }}>{new Date(r.timestamp).toLocaleDateString('de')}</div>
                            </div>
                            <span style={{ color: '#bbb', fontSize: 16, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
                          </button>
                          {open && (
                            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--panel-border,#eee)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                                {SCORE_KEYS.map((k, si) => (
                                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
                                    <span style={{ color: '#666' }}>{SCORE_LABELS[si]}</span>
                                    <strong style={{ color: scoreColor(r.scores?.[k] ?? 0) }}>{r.scores?.[k] ?? '—'}/5</strong>
                                  </div>
                                ))}
                              </div>
                              {r.tasks?.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>Methoden</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {r.tasks.map(t => <span key={t} style={{ background: '#EEF3EE', color: '#3D4A40', fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500 }}>{TASK_LABELS[t] ?? t}</span>)}
                                  </div>
                                </div>
                              )}
                              {r.story?.notable && (
                                <div style={{ marginTop: 10, background: '#FBF8F2', borderLeft: '3px solid #B8975A', padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: '#B8975A', marginBottom: 4 }}>Bemerkenswerter Moment</div>
                                  <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic', lineHeight: 1.6 }}>{r.story.notable}</div>
                                </div>
                              )}
                              {r.story?.surprise && (
                                <div style={{ marginTop: 8, background: '#f8f8f8', padding: '8px 12px', borderRadius: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 3 }}>Überraschung</div>
                                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{r.story.surprise}</div>
                                </div>
                              )}
                              {r.story?.nowork && (
                                <div style={{ marginTop: 8, background: '#f8f8f8', padding: '8px 12px', borderRadius: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 3 }}>Was nicht funktioniert hat</div>
                                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{r.story.nowork}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Export */}
                    <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(sspReflections, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = 'ssp-reflections.json'; a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{ marginTop: 12, width: '100%', background: 'none', border: '1.5px solid var(--panel-border,#e0e0e0)', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 600, color: '#666', cursor: 'pointer' }}
                    >
                      Alle Daten als JSON exportieren
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── FRAGEBOGEN ───────────────────────────────────────── */}
            {adminSection === 'fragebogen' && (() => {
              const SSP_STEPS = [
                { step: 1, title: 'Ein bisschen über dich', questions: ['Vorname oder Alias', 'Wie viele Jahre unterrichtest du Sprachen?', 'Welche Sprache(n) unterrichtest du?'] },
                { step: 2, title: 'Der Unterrichtsrahmen', questions: ['Setting (Privat 1:1 / Schule 1:1 / Kleingruppe / Klasse / Online 1:1 / Online-Gruppe)', 'Altersgruppe der Schüler:innen'] },
                { step: 3, title: 'Der Schüler / die Gruppe', questions: ['Beziehung zur Sprache (Mehrfachauswahl)', 'Gruppenfokus (bei Gruppen)', 'Warum hast du diesen Schüler/diese Gruppe gewählt?'] },
                { step: 4, title: 'Was hast du ausprobiert?', questions: ['Methode 1: Schüler fragen wie er lernen möchte', 'Methode 2: Stunde um beiläufige Erwähnung aufbauen', 'Methode 3: Auf Durchbruch mit sichtbarer Begeisterung reagieren', 'Methode 4: Vorbereitetem Schwenk bei Motivationsverlust nutzen', 'Methode 5: Selbstsicherheit & Genauigkeit getrennt tracken'] },
                { step: 5, title: 'Beobachtungen bewerten', questions: ['Selbstsicherheit (1–5)', 'Genauigkeit (1–5)', 'Sprachbeziehung (1–5)', 'Lehrer-Schüler-Vertrauen (1–5)', 'Nervensystem / Entspannung (1–5)'] },
                { step: 6, title: 'Was ist passiert?', questions: ['Bemerkenswertester Moment', 'Was hat dich überrascht?', 'Was hat nicht funktioniert?', 'Basis- oder Folgestunde?', 'Stundenummer (bei Folgestunden)'] },
              ]
              const saveVersion = () => {
                if (!fragebogenLabel.trim()) return
                const newV = { id: Date.now().toString(), ts: new Date().toISOString(), label: fragebogenLabel.trim(), notes: fragebogenNotes.trim() }
                const next = [...sspFormVersions, newV]
                localStorage.setItem('ssp_form_versions', JSON.stringify(next))
                setSspFormVersions(next)
                setFragebogenLabel('')
                setFragebogenNotes('')
              }
              return (
                <div className="panel-products">
                  {/* Active version info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#B8975A' }}>Aktive Version</span>
                    <span style={{ fontSize: 11, background: '#EDE4D8', color: '#3D4A40', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                      {sspFormVersions.length > 0 ? `v1.${sspFormVersions.length}` : 'v1.0'} — 6 Schritte, 5 Dimensionen
                    </span>
                  </div>

                  {/* Step cards */}
                  {SSP_STEPS.map(s => (
                    <div key={s.step} style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #EDE4D8', marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid #F3EDE5' }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#2C3830', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#2C3830' }}>{s.title}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#aaa' }}>{s.questions.length} Fragen</span>
                      </div>
                      <div style={{ padding: '10px 16px 12px' }}>
                        {s.questions.map((q, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#555', padding: '4px 0', borderBottom: i < s.questions.length - 1 ? '1px solid #F5F1EC' : 'none', display: 'flex', gap: 8 }}>
                            <span style={{ color: '#B8975A', fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{i + 1}.</span>
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Create version */}
                  <div style={{ marginTop: 24, background: 'linear-gradient(135deg,#2C3830,#3D4A40)', borderRadius: 12, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#B8975A', marginBottom: 14, fontWeight: 700 }}>Version erstellen</div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 5 }}>Versionsbezeichnung</div>
                      <input
                        value={fragebogenLabel}
                        onChange={e => setFragebogenLabel(e.target.value)}
                        placeholder="z.B. v1.1 — Frage 3 umformuliert"
                        style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 5 }}>Was hat sich geändert?</div>
                      <textarea
                        value={fragebogenNotes}
                        onChange={e => setFragebogenNotes(e.target.value)}
                        placeholder="Beschreibe die Änderungen dieser Version..."
                        rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>
                    <button
                      onClick={saveVersion}
                      disabled={!fragebogenLabel.trim()}
                      style={{ background: fragebogenLabel.trim() ? '#B8975A' : 'rgba(184,151,90,.3)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: fragebogenLabel.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                    >
                      Version speichern (append-only)
                    </button>
                  </div>

                  {/* Version history */}
                  {sspFormVersions.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 700 }}>Versionshistorie ({sspFormVersions.length})</div>
                      {[...sspFormVersions].reverse().map((v, i) => (
                        <div key={v.id} style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #EDE4D8', padding: '12px 16px', marginBottom: 8, position: 'relative' }}>
                          {i === 0 && <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, background: '#3D4A40', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Neueste</span>}
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#2C3830', marginBottom: 4 }}>{v.label}</div>
                          {v.notes && <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 6 }}>{v.notes}</div>}
                          <div style={{ fontSize: 10, color: '#aaa' }}>{new Date(v.ts).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
          </div>
        </div>

      ) : (

        /* ── BUILDER BODY ───────────────────────────────────────────────── */
        <div className="builder-body">

          {/* LEFT: Canvas editor OR device preview */}
          {device === 'edit' ? (
            <div className="builder-canvas-pane" ref={previewRef} onClick={handleCanvasClick}>
              {/* 1:1 edit layer: the REAL public site, inline-editable (no separate
                  draggable-box canvas). Click any text to edit, images to swap. */}
              <PublicSite
                content={draft}
                editMode={true}
                initPositions={initPositions}
                onTextChange={(field, value) => update(field, value)}
                onImageClick={handleImageClick}
                onUpdate={(field, value) => update(field, value)}
              />
            </div>
          ) : (
            <div className="builder-device-stage">
              <div className="device-frame-wrap">
                <div className={`device-frame device-${device}`}>
                  <PublicSite content={draft} />
                </div>
                <div className="device-frame-label">
                  {device === 'desktop' ? 'Web · 1280 px' : device === 'tablet' ? 'Tablet · 834 px' : 'Mobil · 390 px'}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT: Panel (drag the left edge to resize) */}
          <aside className="builder-panel" style={{ width: panelWidth }}>
            <div className="builder-panel-resize" onMouseDown={startPanelResize} title="Breite ziehen" />
            <div className="builder-tabs">
              {tabs.map(t => (
                <button key={t.id} className={`builder-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="builder-panel-body">

              {/* ── PRODUCTS TAB ──────────────────────────────────────────── */}
              {activeTab === 'products' && (
                <div className="panel-products">
                  <div className="panel-product-list">
                    {(draft.products?.items ?? []).map(p => (
                      <div key={p.id} className={`panel-product-row ${editingProduct === p.id ? 'active' : ''}`} onClick={() => setEditingProduct(p.id)}>
                        <div className="panel-product-thumb">
                          {p.image ? <img src={p.image} alt={p.name} /> : <div className="panel-product-thumb-empty" />}
                        </div>
                        <div className="panel-product-info">
                          <div className="panel-product-name">{p.name}</div>
                          <div className="panel-product-meta">{p.category} &nbsp;·&nbsp; {p.price}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    ))}
                  </div>
                  <button className="panel-add-big-btn" onClick={addProduct}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Session hinzufügen
                  </button>
                </div>
              )}

              {/* ── HERO TAB ──────────────────────────────────────────────── */}
              {activeTab === 'hero' && (
                <>
                  <PanelSection title="Hintergrundbild">
                    <UploadRow src={draft.hero?.image ?? ''} onUpload={() => handleImageClick('hero.image')} uploading={uploading && uploadTarget === 'hero.image'} />
                  </PanelSection>
                  <PanelSection title="Tag (oben)">
                    <Field label="Tag-Text">
                      <input value={draft.hero?.tag ?? ''} onChange={e => update('hero.tag', e.target.value)} placeholder="Direktimporteur · Graz · Österreich" />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Überschrift">
                    <Field label="H1">
                      <input value={draft.hero?.headline ?? ''} onChange={e => update('hero.headline', e.target.value)} placeholder="Elektromobilität. Jetzt." />
                    </Field>
                    <Field label="Unterzeile">
                      <textarea rows={2} value={draft.hero?.subheadline ?? ''} onChange={e => update('hero.subheadline', e.target.value)} />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Buttons">
                    <Field label="Button 1 Text">
                      <input value={draft.hero?.ctaLabel ?? ''} onChange={e => update('hero.ctaLabel', e.target.value)} />
                    </Field>
                    <Field label="Button 1 Link">
                      <input value={draft.hero?.ctaHref ?? ''} onChange={e => update('hero.ctaHref', e.target.value)} placeholder="#products" />
                    </Field>
                    <Field label="Button 2 Text">
                      <input value={draft.hero?.ctaSecLabel ?? ''} onChange={e => update('hero.ctaSecLabel', e.target.value)} placeholder="optional" />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Logo">
                    <UploadRow src={draft.nav?.logo ?? ''} onUpload={() => handleImageClick('nav.logo')} uploading={uploading && uploadTarget === 'nav.logo'} />
                  </PanelSection>
                  <PanelSection title="Telefon (Nav)">
                    <Field label="Nummer">
                      <input value={draft.nav?.phone ?? ''} onChange={e => update('nav.phone', e.target.value)} />
                    </Field>
                  </PanelSection>
                </>
              )}

              {/* ── USP / MEIN ANSATZ TAB ─────────────────────────────────── */}
              {activeTab === 'usp' && (
                <>
                  <PanelSection title="Abschnitts-Beschriftung">
                    <Field label="Eyebrow (Akzent-Text)">
                      <input value={draft.usp?.eyebrow ?? ''} onChange={e => update('usp.eyebrow', e.target.value)} placeholder="My approach" />
                    </Field>
                    <Field label="Überschrift">
                      <input value={draft.usp?.title ?? ''} onChange={e => update('usp.title', e.target.value)} placeholder="Why this works" />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Karten">
                    {(draft.usp?.items ?? []).map((u, i) => (
                      <div key={u.id} style={{ background: 'var(--panel-surface,#f8f8f8)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid var(--panel-border,#e8e8e8)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>Karte {i + 1}</span>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--panel-danger,#d44)', fontSize: 12, padding: '2px 6px' }}
                            onClick={() => update('usp.items', (draft.usp?.items ?? []).filter((_, j) => j !== i))}>
                            Löschen
                          </button>
                        </div>
                        <Field label="Titel">
                          <input value={u.title ?? ''} onChange={e => {
                            const items = [...(draft.usp?.items ?? [])]
                            items[i] = { ...items[i], title: e.target.value }
                            update('usp.items', items)
                          }} placeholder="Conversation First" />
                        </Field>
                        <Field label="Beschreibung">
                          <textarea rows={3} value={u.description ?? ''} onChange={e => {
                            const items = [...(draft.usp?.items ?? [])]
                            items[i] = { ...items[i], description: e.target.value }
                            update('usp.items', items)
                          }} placeholder="Beschreibe diesen Punkt..." />
                        </Field>
                      </div>
                    ))}
                    <button className="panel-add-big-btn" onClick={() => {
                      const items = [...(draft.usp?.items ?? []), { id: `u${Date.now()}`, title: 'Neue Karte', description: '' }]
                      update('usp.items', items)
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Karte hinzufügen
                    </button>
                  </PanelSection>
                </>
              )}

              {/* ── ÜBER MICH TAB ─────────────────────────────────────────── */}
              {activeTab === 'about' && (
                <>
                  <PanelSection title="Text">
                    <Field label="Eyebrow (klein, oben)">
                      <input value={draft.about?.eyebrow ?? ''} onChange={e => update('about.eyebrow', e.target.value)} placeholder="About me" />
                    </Field>
                    <Field label="Überschrift">
                      <input value={draft.about?.headline ?? ''} onChange={e => update('about.headline', e.target.value)} placeholder="Hello, I'm Niki." />
                    </Field>
                    <Field label="Bio-Text">
                      <textarea rows={5} value={draft.about?.bio ?? ''} onChange={e => update('about.bio', e.target.value)} placeholder="A few warm, honest sentences about you..." />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Kennzahlen">
                    {(draft.about?.stats ?? []).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <input style={{ width: 80, flexShrink: 0 }} value={s.value} placeholder="10+" onChange={e => {
                          const stats = [...(draft.about?.stats ?? [])]
                          stats[i] = { ...stats[i], value: e.target.value }
                          update('about.stats', stats)
                        }} />
                        <input style={{ flex: 1 }} value={s.label} placeholder="years active" onChange={e => {
                          const stats = [...(draft.about?.stats ?? [])]
                          stats[i] = { ...stats[i], label: e.target.value }
                          update('about.stats', stats)
                        }} />
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d44', padding: '0 4px', fontSize: 18, lineHeight: 1 }}
                          onClick={() => update('about.stats', (draft.about?.stats ?? []).filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                    <button className="panel-add-big-btn" onClick={() => {
                      update('about.stats', [...(draft.about?.stats ?? []), { value: '', label: '' }])
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Kennzahl hinzufügen
                    </button>
                  </PanelSection>
                </>
              )}

              {/* ── NEWS TAB ──────────────────────────────────────────────── */}
              {activeTab === 'news' && (
                <div className="panel-products">
                  <div className="panel-product-list">
                    {(draft.news?.items ?? []).map(n => (
                      <div key={n.id} className={`panel-product-row ${editingNews === n.id ? 'active' : ''}`} onClick={() => setEditingNews(n.id)}>
                        <div className="panel-product-info">
                          <div className="panel-product-name">{n.title}</div>
                          <div className="panel-product-meta">{n.date}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    ))}
                  </div>
                  <button className="panel-add-big-btn" onClick={addNews}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Blogbeitrag hinzufügen
                  </button>
                </div>
              )}

              {/* ── CONTACT TAB ───────────────────────────────────────────── */}
              {/* ── PRICING & CERTIFICATES TAB ─────────────────────────── */}
              {activeTab === 'pricing' && (
                <>
                  <PanelSection title="Preise">
                    <Field label="Abschnittstitel">
                      <input value={(draft as any).pricing?.title ?? ''} onChange={e => update('pricing.title', e.target.value)} />
                    </Field>
                    <Field label="Text (Absätze durch Leerzeile trennen)">
                      <textarea rows={8} value={(draft as any).pricing?.body ?? ''} onChange={e => update('pricing.body', e.target.value)} />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Zertifikate">
                    {((draft as any).certificates?.items ?? []).map((cert: { id: string; title: string; subtitle: string; file: string }, i: number) => (
                      <div key={cert.id} className="panel-cert-row">
                        <Field label={`Zertifikat ${i + 1} — Titel`}>
                          <input value={cert.title} onChange={e => update('certificates.items', (draft as any).certificates.items.map((c: { id: string }) => c.id === cert.id ? { ...c, title: e.target.value } : c))} />
                        </Field>
                        <Field label="Untertitel">
                          <input value={cert.subtitle} onChange={e => update('certificates.items', (draft as any).certificates.items.map((c: { id: string }) => c.id === cert.id ? { ...c, subtitle: e.target.value } : c))} />
                        </Field>
                        <Field label="Datei">
                          <UploadRow
                            src={cert.file}
                            onUpload={() => { setUploadTarget(`cert:${cert.id}`); fileRef.current?.click() }}
                            uploading={uploading}
                          />
                        </Field>
                      </div>
                    ))}
                  </PanelSection>
                </>
              )}

              {activeTab === 'ssp' && (
                <>
                  <PanelSection title="Silent Student Project">
                    <Field label="Badge-Text">
                      <input data-cid="ssp.badge" value={draft.ssp?.badge ?? ''} onChange={e => update('ssp.badge', e.target.value)} placeholder="Research Portal" />
                    </Field>
                    <Field label="Titel">
                      <input data-cid="ssp.title" value={draft.ssp?.title ?? ''} onChange={e => update('ssp.title', e.target.value)} placeholder="The Silent Student Project" />
                    </Field>
                    <Field label="Beschreibungstext">
                      <textarea rows={4} data-cid="ssp.sub" value={draft.ssp?.sub ?? ''} onChange={e => update('ssp.sub', e.target.value)} placeholder="Exploring the half of language learning..." style={{ resize: 'vertical' }} />
                    </Field>
                    <Field label="Button-Text">
                      <input data-cid="ssp.button" value={draft.ssp?.button ?? ''} onChange={e => update('ssp.button', e.target.value)} placeholder="Member login →" />
                    </Field>
                    <div style={{ marginTop: 12, padding: '10px 12px', background: '#F8F5F0', borderRadius: 8, fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                      Teilnehmer-Code: <strong style={{ color: '#3D4A40' }}>ssp2026</strong><br />
                      Reflexionen im Verwaltung → Forschung-Tab ansehen.
                    </div>
                  </PanelSection>
                </>
              )}

              {activeTab === 'contact' && (
                <>
                  <PanelSection title="Kontaktdaten">
                    <Field label="Titel">
                      <input value={draft.contact?.title ?? ''} onChange={e => update('contact.title', e.target.value)} />
                    </Field>
                    <Field label="E-Mail">
                      <input type="email" value={draft.contact?.email ?? ''} onChange={e => update('contact.email', e.target.value)} />
                    </Field>
                    <Field label="Telefon">
                      <input value={draft.contact?.phone ?? ''} onChange={e => update('contact.phone', e.target.value)} />
                    </Field>
                    <Field label="Adresse">
                      <textarea rows={2} value={draft.contact?.address ?? ''} onChange={e => update('contact.address', e.target.value)} />
                    </Field>
                  </PanelSection>
                  <PanelSection title="WhatsApp">
                    <Field label="Nummer (int. Format)">
                      <input value={draft.whatsapp?.number ?? ''} onChange={e => update('whatsapp.number', e.target.value)} placeholder="+436641234567" />
                    </Field>
                    <Field label="Vorausgefüllte Nachricht">
                      <textarea rows={2} value={draft.whatsapp?.message ?? ''} onChange={e => update('whatsapp.message', e.target.value)} />
                    </Field>
                    <Field label="">
                      <label className="panel-checkbox">
                        <input type="checkbox" checked={draft.whatsapp?.enabled ?? false} onChange={e => update('whatsapp.enabled', e.target.checked)} />
                        WhatsApp-Button anzeigen
                      </label>
                    </Field>
                  </PanelSection>
                  <PanelSection title="Karte">
                    <Field label="Google Maps Embed-URL">
                      <textarea rows={2} value={draft.contact?.mapSrc ?? ''} onChange={e => update('contact.mapSrc', e.target.value)} placeholder="https://maps.google.com/maps?q=…&output=embed" />
                    </Field>
                    <Field label="">
                      <label className="panel-checkbox">
                        <input type="checkbox" checked={draft.contact?.formEnabled ?? false} onChange={e => update('contact.formEnabled', e.target.checked)} />
                        Kontaktformular anzeigen
                      </label>
                    </Field>
                  </PanelSection>
                </>
              )}

              {/* ── STYLE TAB ─────────────────────────────────────────────── */}
              {activeTab === 'style' && (
                <>
                  <PanelSection title="Farben">
                    <ColorRow label="Primärfarbe" value={draft.meta?.primaryColor ?? '#0099CC'} onChange={v => update('meta.primaryColor', v)} />
                    <ColorRow label="Akzentfarbe" value={draft.meta?.accentColor ?? '#B3E600'} onChange={v => update('meta.accentColor', v)} />
                  </PanelSection>
                  <PanelSection title="Schrift">
                    <div className="panel-field">
                      <select value={draft.meta?.font ?? ''} onChange={e => update('meta.font', e.target.value)}>
                        <option value="system-ui, -apple-system, sans-serif">System Standard</option>
                        <option value="'Inter', sans-serif">Inter</option>
                        <option value="'Georgia', serif">Georgia</option>
                        <option value="'Roboto', sans-serif">Roboto</option>
                        <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica Neue</option>
                      </select>
                    </div>
                  </PanelSection>
                  <PanelSection title="SEO / Meta">
                    <Field label="Seitentitel">
                      <input value={draft.meta?.title ?? ''} onChange={e => update('meta.title', e.target.value)} />
                    </Field>
                    <Field label="Beschreibung">
                      <textarea rows={2} value={draft.meta?.description ?? ''} onChange={e => update('meta.description', e.target.value)} />
                    </Field>
                  </PanelSection>
                  <PanelSection title="Footer">
                    <Field label="Copyright">
                      <input value={draft.footer?.copyright ?? ''} onChange={e => update('footer.copyright', e.target.value)} />
                    </Field>
                    <Field label="Tagline">
                      <input value={draft.footer?.tagline ?? ''} onChange={e => update('footer.tagline', e.target.value)} />
                    </Field>
                  </PanelSection>
                </>
              )}

            </div>

            {/* SAVE FOOTER — admin changes auto-save via GitHub */}
            <div className="builder-panel-foot">
              <button
                className={`builder-save-btn ${saving ? 'loading' : ''} ${saved ? 'done' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichern…' : saved ? 'Gespeichert!' : 'Speichern'}
              </button>
            </div>
          </aside>
        </div>

      )}

      {/* ── SESSION EDIT MODAL ─────────────────────────────────────────── */}
      {editingProd && (
        <div className="pem-overlay" onClick={() => setEditingProduct(null)}>
          <div className="pem" onClick={e => e.stopPropagation()}>
            <div className="pem-header">
              <span className="pem-title">Session bearbeiten</span>
              <button className="pem-close" onClick={() => setEditingProduct(null)} title="Schließen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="pem-body">
              <div className="pem-img-area">
                {editingProd.image
                  ? <img src={editingProd.image} alt={editingProd.name} className="pem-img" />
                  : <div className="pem-img-placeholder">Kein Bild</div>}
                <button className="pem-img-btn" onClick={() => uploadProductImage(editingProd.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Bild tauschen
                </button>
              </div>
              <div className="pem-fields">
                <div className="pem-field">
                  <label>Name</label>
                  <input value={editingProd.name} onChange={e => updateProduct(editingProd.id, 'name', e.target.value)} />
                </div>
                <div className="pem-row">
                  <div className="pem-field">
                    <label>Preis</label>
                    <input value={editingProd.price} onChange={e => updateProduct(editingProd.id, 'price', e.target.value)} placeholder="Auf Anfrage" />
                  </div>
                  <div className="pem-field">
                    <label>Kategorie</label>
                    <select value={editingProd.category} onChange={e => updateProduct(editingProd.id, 'category', e.target.value)}>
                      {(draft.products?.tabs?.slice(1) ?? []).map(t => <option key={t} value={t}>{t}</option>)}
                      {!(draft.products?.tabs?.slice(1) ?? []).includes(editingProd.category) && <option value={editingProd.category}>{editingProd.category}</option>}
                    </select>
                  </div>
                  <div className="pem-field">
                    <label>Badge</label>
                    <input value={editingProd.badge ?? ''} onChange={e => updateProduct(editingProd.id, 'badge', e.target.value)} placeholder="z.B. Beliebt" />
                  </div>
                </div>
                <div className="pem-field">
                  <label>Beschreibung</label>
                  <textarea rows={3} value={editingProd.description} onChange={e => updateProduct(editingProd.id, 'description', e.target.value)} />
                </div>
                <div className="pem-field">
                  <label>Inhalte (Tags)</label>
                  <div className="pem-tags">
                    {(editingProd.specs ?? []).map((s, i) => (
                      <span key={i} className="pem-tag">
                        {s}
                        <button onClick={() => updateProduct(editingProd.id, 'specs', (editingProd.specs ?? []).filter((_, idx) => idx !== i))} title="Entfernen">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="pem-tag-input-row">
                    <input value={specsInput} placeholder="Tag hinzufügen, Enter" onChange={e => setSpecsInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = specsInput.trim(); if (v) { updateProduct(editingProd.id, 'specs', [...(editingProd.specs ?? []), v]); setSpecsInput('') } } }} />
                    <button className="pem-tag-add" onClick={() => { const v = specsInput.trim(); if (v) { updateProduct(editingProd.id, 'specs', [...(editingProd.specs ?? []), v]); setSpecsInput('') } }}>+</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="pem-footer">
              <button className="panel-delete-btn" onClick={() => deleteProduct(editingProd.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Löschen
              </button>
              <div className="pem-footer-right">
                <button className="builder-save-btn-top" onClick={() => { setEditingProduct(null); handleSave() }} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BLOG EDIT MODAL ────────────────────────────────────────────── */}
      {editingNewsItem && (
        <div className="pem-overlay" onClick={() => setEditingNews(null)}>
          <div className="pem" onClick={e => e.stopPropagation()}>
            <div className="pem-header">
              <span className="pem-title">Blogbeitrag bearbeiten</span>
              <button className="pem-close" onClick={() => setEditingNews(null)} title="Schließen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="pem-body">
              <div className="pem-img-area">
                {editingNewsItem.image
                  ? <img src={editingNewsItem.image} alt={editingNewsItem.title} className="pem-img" />
                  : <div className="pem-img-placeholder">Kein Bild</div>}
                <button className="pem-img-btn" onClick={() => uploadNewsImage(editingNewsItem.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Bild (optional)
                </button>
              </div>
              <div className="pem-fields">
                <div className="pem-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="pem-field">
                    <label>Datum</label>
                    <input type="date" value={editingNewsItem.date} onChange={e => updateNews(editingNewsItem.id, 'date', e.target.value)} />
                  </div>
                </div>
                <div className="pem-field">
                  <label>Titel</label>
                  <input value={editingNewsItem.title} onChange={e => updateNews(editingNewsItem.id, 'title', e.target.value)} />
                </div>
                <div className="pem-field">
                  <label>Text</label>
                  <textarea rows={6} value={editingNewsItem.body} onChange={e => updateNews(editingNewsItem.id, 'body', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="pem-footer">
              <button className="panel-delete-btn" onClick={() => deleteNews(editingNewsItem.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Löschen
              </button>
              <div className="pem-footer-right">
                <button className="builder-save-btn-top" onClick={() => { setEditingNews(null); handleSave() }} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-section">
      {title && <div className="panel-section-title">{title}</div>}
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel-field">
      {label && <label>{label}</label>}
      {children}
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="panel-color-row">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span className="panel-color-label">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="panel-color-hex" />
    </div>
  )
}

function UploadRow({ src, onUpload, uploading }: { src: string; onUpload: () => void; uploading: boolean }) {
  return (
    <div className="panel-upload-row">
      {src && <img src={src} alt="" className="panel-upload-thumb" />}
      <button className="panel-upload-btn" onClick={onUpload} disabled={uploading}>
        {uploading ? 'Hochladen…' : src ? 'Ändern' : 'Hochladen'}
      </button>
    </div>
  )
}
