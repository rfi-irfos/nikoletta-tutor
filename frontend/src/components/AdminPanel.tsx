import { useState, useRef } from 'react'
import type { SiteContent, ProductItem, NewsItem } from '../types/content'
import type { User } from '../hooks/useAuth'
import { PublicSite } from './PublicSite'

interface Props {
  content: SiteContent
  user: User
  saving: boolean
  onSave: (c: SiteContent) => Promise<boolean>
  onUpload: (f: File) => Promise<string | null>
  onLogout: () => void
}

type PanelTab = 'products' | 'hero' | 'news' | 'contact' | 'style'
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
  const [saved, setSaved] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editingNews, setEditingNews] = useState<string | null>(null)
  const [device, setDevice] = useState<DeviceView>('edit')
  const fileRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // ── Init positions snapshot for canvas ────────────────────────────────────

  const [initPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (!previewRef.current) return {}
    return {}
  })

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
    const newProduct: ProductItem = { id, name: 'Neues Produkt', description: '', price: '', image: '', category: 'E-Bikes', specs: [] }
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
    const newItem: NewsItem = { id, date: today, title: 'Neue Neuigkeit', body: '', image: '' }
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
    { id: 'products', label: 'Produkte' },
    { id: 'hero',     label: 'Hero' },
    { id: 'news',     label: 'Neuigkeiten' },
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
          <strong>{draft.nav?.brand || 'Meine Website'}</strong>
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
            className={`builder-save-btn-top ${saving ? 'loading' : ''} ${saved ? 'done' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Speichern…' : saved ? 'Gespeichert' : 'Speichern'}
          </button>
          <button className="builder-btn-ghost" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      <div className="builder-body">

        {/* LEFT: Canvas editor OR device preview */}
        {device === 'edit' ? (
          <div className="builder-canvas-pane" ref={previewRef}>
            <PublicSite
              content={draft}
              editMode={false}
              rearrangeMode={true}
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

        {/* RIGHT: Panel */}
        <aside className="builder-panel">
          {/* Tab bar */}
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

                {editingProd ? (
                  /* ─ Product edit form ─ */
                  <div className="panel-product-form">
                    <button className="panel-back-btn" onClick={() => setEditingProduct(null)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Zur Liste
                    </button>

                    {/* Image */}
                    <div className="panel-product-img-area" onClick={() => uploadProductImage(editingProd.id)}>
                      {editingProd.image
                        ? <img src={editingProd.image} alt={editingProd.name} />
                        : <div className="panel-product-img-empty">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>Bild hochladen</span>
                          </div>
                      }
                      <div className="panel-product-img-overlay">Bild ändern</div>
                    </div>

                    <Field label="Name">
                      <input value={editingProd.name} onChange={e => updateProduct(editingProd.id, 'name', e.target.value)} placeholder="Produktname" />
                    </Field>
                    <Field label="Preis">
                      <input value={editingProd.price} onChange={e => updateProduct(editingProd.id, 'price', e.target.value)} placeholder="ab €799" />
                    </Field>
                    <Field label="Kategorie">
                      <select value={editingProd.category} onChange={e => updateProduct(editingProd.id, 'category', e.target.value)}>
                        {(draft.products?.tabs?.filter(t => t !== 'Alle') ?? ['E-Bikes']).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Bezeichnung">
                      <input value={editingProd.badge ?? ''} onChange={e => updateProduct(editingProd.id, 'badge', e.target.value)} placeholder="Bestseller, Beliebt …" />
                    </Field>
                    <Field label="Spezifikationen (Komma-getrennt)">
                      <input
                        value={(editingProd.specs ?? []).join(', ')}
                        onChange={e => updateProduct(editingProd.id, 'specs', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="48V, 20Ah, 80 km"
                      />
                    </Field>
                    <Field label="Beschreibung">
                      <textarea rows={3} value={editingProd.description} onChange={e => updateProduct(editingProd.id, 'description', e.target.value)} placeholder="Kurze Produktbeschreibung" />
                    </Field>

                    <button className="panel-delete-btn" onClick={() => deleteProduct(editingProd.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Produkt löschen
                    </button>
                  </div>
                ) : (
                  /* ─ Product list ─ */
                  <>
                    <div className="panel-product-list">
                      {(draft.products?.items ?? []).map(p => (
                        <div key={p.id} className="panel-product-row" onClick={() => setEditingProduct(p.id)}>
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
                      Produkt hinzufügen
                    </button>
                  </>
                )}
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

            {/* ── NEWS TAB ──────────────────────────────────────────────── */}
            {activeTab === 'news' && (
              <div className="panel-products">
                {editingNewsItem ? (
                  <div className="panel-product-form">
                    <button className="panel-back-btn" onClick={() => setEditingNews(null)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Zur Liste
                    </button>
                    <div className="panel-product-img-area" onClick={() => uploadNewsImage(editingNewsItem.id)}>
                      {editingNewsItem.image
                        ? <img src={editingNewsItem.image} alt={editingNewsItem.title} />
                        : <div className="panel-product-img-empty">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>Bild (optional)</span>
                          </div>
                      }
                      <div className="panel-product-img-overlay">Bild ändern</div>
                    </div>
                    <Field label="Datum">
                      <input type="date" value={editingNewsItem.date} onChange={e => updateNews(editingNewsItem.id, 'date', e.target.value)} />
                    </Field>
                    <Field label="Titel">
                      <input value={editingNewsItem.title} onChange={e => updateNews(editingNewsItem.id, 'title', e.target.value)} />
                    </Field>
                    <Field label="Text">
                      <textarea rows={4} value={editingNewsItem.body} onChange={e => updateNews(editingNewsItem.id, 'body', e.target.value)} />
                    </Field>
                    <button className="panel-delete-btn" onClick={() => deleteNews(editingNewsItem.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Eintrag löschen
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="panel-product-list">
                      {(draft.news?.items ?? []).map(n => (
                        <div key={n.id} className="panel-product-row" onClick={() => setEditingNews(n.id)}>
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
                      Neuigkeit hinzufügen
                    </button>
                  </>
                )}
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

          </div>

          {/* SAVE FOOTER */}
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
