import { useState, useRef, useEffect } from 'react'
import type { SiteContent, ProductItem, NewsItem } from '../types/content'
import type { User } from '../hooks/useAuth'
import { PublicSite } from './PublicSite'
import { useStudents } from '../lib/useStudents'
import { useTestimonials } from '../lib/useTestimonials'
import type { Student } from '../types/students'
import type { Testimonial } from '../types/testimonials'
import { useLang } from '../hooks/useLang'

interface Props {
  content: SiteContent
  user: User
  saving: boolean
  onSave: (c: SiteContent) => Promise<boolean>
  onUpload: (f: File) => Promise<string | null>
  onLogout: () => void
}

type PanelTab = 'products' | 'hero' | 'about' | 'usp' | 'news' | 'contact' | 'style' | 'students' | 'reviews'
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

export function AdminPanel({ content, user, saving, onSave, onUpload, onLogout }: Props) {
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
  const [device, setDevice] = useState<DeviceView>('edit')
  const [adminMode, setAdminMode] = useState(false)
  const [adminSection, setAdminSection] = useState<'reviews' | 'students'>('reviews')
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
    // Don't intercept clicks on editable text — let them focus for inline editing
    const target = e.target as HTMLElement
    if (target.isContentEditable || target.closest('.editable-text')) return
    const el = target.closest('[data-cid]') as HTMLElement | null
    if (!el) return
    const cid = el.dataset.cid ?? ''
    if (cid.startsWith('about.')) {
      setActiveTab('about')
    } else if (cid.startsWith('hero.') || cid.startsWith('nav.')) {
      setActiveTab('hero')
    } else if (cid.startsWith('products.items.')) {
      const idx = parseInt(cid.split('.')[2])
      const item = draft.products?.items?.[idx]
      if (item) { setActiveTab('products'); setEditingProduct(item.id) }
    } else if (cid.startsWith('news.items.')) {
      const idx = parseInt(cid.split('.')[2])
      const item = draft.news?.items?.[idx]
      if (item) { setActiveTab('news'); setEditingNews(item.id) }
    } else if (cid.startsWith('contact.') || cid.startsWith('whatsapp.')) {
      setActiveTab('contact')
    } else if (cid.startsWith('usp.')) {
      setActiveTab('usp')
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
          <span className="builder-user">{user.name || user.email}</span>
          <button
            className={`builder-btn-ghost ${adminMode ? 'active' : ''}`}
            onClick={() => setAdminMode(m => !m)}
            title="Verwaltung: CRM & Bewertungen"
          >Admin</button>
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
          {/* Tab bar — admin mode vs builder mode */}
          {adminMode ? (
            <div className="builder-tabs">
              <button className={`builder-tab ${adminSection === 'reviews' ? 'active' : ''}`} onClick={() => setAdminSection('reviews')}>Reviews</button>
              <button className={`builder-tab ${adminSection === 'students' ? 'active' : ''}`} onClick={() => setAdminSection('students')}>Schüler</button>
            </div>
          ) : (
            <div className="builder-tabs">
              {tabs.map(t => (
                <button key={t.id} className={`builder-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

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

            {/* ── REVIEWS TAB (Admin Panel) ─────────────────────────────── */}
            {adminSection === 'reviews' && adminMode && (
              <div className="panel-products">
                <div style={{ fontSize: 11, color: 'var(--panel-muted,#888)', marginBottom: 10, lineHeight: 1.5 }}>
                  Wenn eine Bewertung per E-Mail eingeht, hier manuell hinzufügen. Nur genehmigte erscheinen auf der Website.
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

            {/* ── STUDENTS TAB (Admin Panel) ────────────────────────────── */}
            {adminSection === 'students' && adminMode && (
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

          </div>

          {/* SAVE FOOTER — only in builder mode (admin changes auto-save via GitHub) */}
          {!adminMode && (
            <div className="builder-panel-foot">
              <button
                className={`builder-save-btn ${saving ? 'loading' : ''} ${saved ? 'done' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichern…' : saved ? 'Gespeichert!' : 'Speichern'}
              </button>
            </div>
          )}
        </aside>
      </div>

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
