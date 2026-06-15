import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { SiteContent, SectionId, CanvasPos, ProductItem } from '../types/content'
import { useTheme, type Theme } from '../hooks/useTheme'
import { useLang, type Lang } from '../hooks/useLang'

// ── Edit context ─────────────────────────────────────────────────────────────

interface EditCtx {
  editMode: boolean
  onTextChange: (field: string, value: string) => void
  onImageClick: (field: string) => void
  onUpdate: (field: string, value: unknown) => void
  setFocusedEl: (el: HTMLElement | null) => void
}
const Ctx = createContext<EditCtx>({
  editMode: false,
  onTextChange: () => {},
  onImageClick: () => {},
  onUpdate: () => {},
  setFocusedEl: () => {},
})

// ── Inline-edit primitives ────────────────────────────────────────────────────

type TagName = keyof React.JSX.IntrinsicElements

interface EProps {
  field: string
  value: string
  as?: TagName
  className?: string
  style?: React.CSSProperties
  href?: string
  title?: string
}

function E({ field, value, as, className, style, href, title }: EProps) {
  const { editMode, onTextChange, setFocusedEl } = useContext(Ctx)
  const Tag = (as ?? 'span') as TagName

  if (!editMode) {
    const props: Record<string, unknown> = { className, style, dangerouslySetInnerHTML: { __html: value }, 'data-cid': field }
    if (href) props.href = href
    if (title) props.title = title
    return <Tag {...props} />
  }

  const editProps: Record<string, unknown> = {
    className: `${className ?? ''} editable-text`,
    style,
    'data-cid': field,
    contentEditable: true,
    suppressContentEditableWarning: true,
    dangerouslySetInnerHTML: { __html: value },
    onFocus: (e: React.FocusEvent<HTMLElement>) => setFocusedEl(e.currentTarget),
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      setFocusedEl(null)
      onTextChange(field, e.currentTarget.innerHTML)
    },
  }
  if (href) editProps.href = href
  return <Tag {...editProps} />
}

interface EImgProps {
  field: string
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}

function EImg({ field, src, alt = '', className, style }: EImgProps) {
  const { editMode, onImageClick } = useContext(Ctx)
  if (!src && !editMode) return null
  if (!editMode) return <img src={src} alt={alt} className={className} style={style} data-cid={field} />
  return (
    <div className="editable-img-wrap" style={{ display: 'contents' }} onClick={() => onImageClick(field)} data-cid={field}>
      {src
        ? <img src={src} alt={alt} className={`${className ?? ''} editable-img`} style={style} />
        : <div className={`editable-img-placeholder ${className ?? ''}`} style={style}>Bild hochladen</div>}
      <div className="editable-img-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
    </div>
  )
}

// ── Format toolbar ────────────────────────────────────────────────────────────

function FormatToolbar({ anchorEl }: { anchorEl: HTMLElement | null }) {
  if (!anchorEl) return null
  const rect = anchorEl.getBoundingClientRect()
  const tbW = 308
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - tbW / 2, window.innerWidth - tbW - 8))
  const top = rect.top < 56 ? rect.bottom + 6 : rect.top - 46
  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); anchorEl.focus() }
  return (
    <div className="format-toolbar" style={{ position: 'fixed', top, left, width: tbW, zIndex: 9999 }} onMouseDown={e => e.preventDefault()}>
      <button className="fmt-btn fmt-b" onClick={() => exec('bold')}>B</button>
      <button className="fmt-btn fmt-i" onClick={() => exec('italic')}>I</button>
      <button className="fmt-btn fmt-u" onClick={() => exec('underline')}>U</button>
      <div className="fmt-sep" />
      <button className="fmt-btn" onClick={() => exec('justifyLeft')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg></button>
      <button className="fmt-btn" onClick={() => exec('justifyCenter')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></button>
      <div className="fmt-sep" />
      <button className="fmt-btn fmt-size-s" onClick={() => exec('fontSize', '2')}>S</button>
      <button className="fmt-btn" onClick={() => exec('fontSize', '4')}>M</button>
      <button className="fmt-btn fmt-size-l" onClick={() => exec('fontSize', '5')}>L</button>
      <div className="fmt-sep" />
      <label className="fmt-color-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        <input type="color" defaultValue="#111111" onChange={e => exec('foreColor', e.target.value)} onMouseDown={e => e.stopPropagation()} className="fmt-color-input" />
      </label>
    </div>
  )
}

// ── Canvas element (drag wrapper) ─────────────────────────────────────────────

interface CanvasElProps {
  id: string
  pos: CanvasPos
  onMove: (p: CanvasPos) => void
  children: React.ReactNode
  minWidth?: number
  noPad?: boolean
  label?: string
}

function CanvasEl({ id, pos, onMove, children, minWidth = 160, noPad, label }: CanvasElProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ mx: number; my: number; sx: number; sy: number } | null>(null)

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragState.current = { mx: e.clientX, my: e.clientY, sx: pos.x, sy: pos.y }

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current || !elRef.current) return
      elRef.current.style.left = `${dragState.current.sx + ev.clientX - dragState.current.mx}px`
      elRef.current.style.top  = `${dragState.current.sy + ev.clientY - dragState.current.my}px`
    }
    const onMouseUp = (ev: MouseEvent) => {
      if (!dragState.current) return
      const nx = dragState.current.sx + ev.clientX - dragState.current.mx
      const ny = dragState.current.sy + ev.clientY - dragState.current.my
      dragState.current = null
      onMove({ x: nx, y: ny })
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      ref={elRef}
      data-cid={id}
      className={`canvas-el${noPad ? ' canvas-el-nopad' : ''}`}
      style={{ position: 'absolute', left: pos.x, top: pos.y, minWidth }}
    >
      {label && <div className="canvas-el-label">{label}</div>}
      <div className="canvas-el-grip" onMouseDown={startDrag} title="Ziehen zum Verschieben">
        <svg width="10" height="16" viewBox="0 0 10 24" fill="currentColor">
          <circle cx="3" cy="4"  r="1.8"/><circle cx="7" cy="4"  r="1.8"/>
          <circle cx="3" cy="12" r="1.8"/><circle cx="7" cy="12" r="1.8"/>
          <circle cx="3" cy="20" r="1.8"/><circle cx="7" cy="20" r="1.8"/>
        </svg>
      </div>
      {children}
    </div>
  )
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconDelivery() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
}
function IconShield() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
}
function IconTag() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2.5"/></svg>
}
function IconLocation() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function IconPhone() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.1-.45c.908.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
}
function IconMail() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}

function TrustIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'delivery': return <IconDelivery />
    case 'shield':   return <IconShield />
    case 'tag':      return <IconTag />
    case 'location': return <IconLocation />
    default:         return <IconShield />
  }
}

// ── Contact form ──────────────────────────────────────────────────────────────

function ContactForm({ email }: { email: string }) {
  const { t } = useLang()
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const to = email || 'nikoletta.csonka@gmail.com'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined
    if (!key) {
      // Fallback: open mailto pre-filled
      const body = encodeURIComponent(`Name: ${form.name}\nPhone: ${form.phone}\n\n${form.message}`)
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(`${t.mailSubject} ${form.name}`)}&body=${body}`
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: key,
          subject: `${t.mailSubject} ${form.name}`,
          ...form,
        }),
      })
      const data = await res.json()
      setStatus(data.success ? 'ok' : 'err')
    } catch {
      setStatus('err')
    }
  }

  if (status === 'ok') {
    return (
      <div className="site-contact-form-success">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <p>{t.success}</p>
      </div>
    )
  }

  return (
    <form className="site-contact-form" onSubmit={submit}>
      <div className="site-contact-form-row">
        <input placeholder={t.namePlaceholder} required value={form.name} onChange={e => set('name', e.target.value)} />
        <input placeholder={t.emailPlaceholder} type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
      </div>
      <input placeholder={t.phonePlaceholder} value={form.phone} onChange={e => set('phone', e.target.value)} />
      <textarea placeholder={t.messagePlaceholder} rows={4} required value={form.message} onChange={e => set('message', e.target.value)} />
      <button type="submit" disabled={status === 'sending'} className="site-contact-form-btn">
        {status === 'sending' ? `${t.sending}…` : t.send}
      </button>
      {status === 'err' && <p className="site-contact-form-err">{t.error}</p>}
    </form>
  )
}

// ── WhatsApp button ───────────────────────────────────────────────────────────

function WhatsAppButton({ number, message }: { number: string; message: string }) {
  const href = `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
  return (
    <a className="site-whatsapp-btn" href={href} target="_blank" rel="noopener noreferrer" title="WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.118 1.533 5.851L0 24l6.335-1.513A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.843 0-3.57-.49-5.062-1.346L2.5 21.5l.854-3.375A9.944 9.944 0 0 1 2 12c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    </a>
  )
}

// ── Theme toggle (light / dark / high-contrast) ───────────────────────────────

function IconSun() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
}
function IconMoon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
}
function IconContrast() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18z" fill="currentColor"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>
}
function IconMenu() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}
function IconClose() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

const THEME_OPTS: { id: Theme; icon: React.ReactNode }[] = [
  { id: 'light', icon: <IconSun /> },
  { id: 'dark', icon: <IconMoon /> },
  { id: 'hc', icon: <IconContrast /> },
]

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { t } = useLang()
  const labels: Record<Theme, string> = { light: t.themeLight, dark: t.themeDark, hc: t.themeContrast }
  return (
    <div className="theme-toggle" role="group" aria-label={t.colorScheme}>
      {THEME_OPTS.map(o => (
        <button
          key={o.id}
          type="button"
          className={`theme-toggle-btn ${theme === o.id ? 'active' : ''}`}
          aria-pressed={theme === o.id}
          aria-label={labels[o.id]}
          title={labels[o.id]}
          onClick={() => setTheme(o.id)}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}

// ── Language toggle (EN / DE) ─────────────────────────────────────────────────

const LANG_OPTS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'de', label: 'DE' },
]

function LanguageToggle() {
  const { lang, setLang, t } = useLang()
  return (
    <div className="lang-toggle" role="group" aria-label={t.language}>
      {LANG_OPTS.map(o => (
        <button
          key={o.id}
          type="button"
          className={`lang-toggle-btn ${lang === o.id ? 'active' : ''}`}
          aria-pressed={lang === o.id}
          onClick={() => setLang(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Public Site ───────────────────────────────────────────────────────────────

interface Props {
  content: SiteContent
  editMode?: boolean
  rearrangeMode?: boolean
  initPositions?: Record<string, CanvasPos>
  onTextChange?: (field: string, value: string) => void
  onImageClick?: (field: string) => void
  onUpdate?: (field: string, value: unknown) => void
  onSectionReorder?: (order: SectionId[]) => void
}

export function PublicSite({
  content, editMode = false, rearrangeMode = false, initPositions = {},
  onTextChange, onImageClick, onUpdate,
}: Props) {
  const { meta, nav, hero, trust, categories, products, usp, news, contact, whatsapp, footer } = content

  const [focusedEl, setFocusedEl] = useState<HTMLElement | null>(null)
  const [activeTab, setActiveTab] = useState('Alle')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<ProductItem | null>(null)
  const { theme, setTheme } = useTheme()
  const { t } = useLang()

  // Keep the product filter valid when the language (and its tab labels) changes
  useEffect(() => {
    const tabs = content.products?.tabs ?? []
    if (tabs.length && !tabs.includes(activeTab)) setActiveTab(tabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.products?.tabs])

  // Close the session detail modal on Escape
  useEffect(() => {
    if (!modalProduct) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalProduct(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalProduct])

  // Tier 1 → Tier 2: an audience card drills into the matching Sessions filter
  const drillToSessions = (cat: { tab?: string }, idx: number) => {
    const tabs = content.products?.tabs ?? []
    const target = (cat.tab && tabs.includes(cat.tab)) ? cat.tab : (tabs[idx + 1] ?? tabs[0] ?? 'Alle')
    setActiveTab(target)
    requestAnimationFrame(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const [heroBgPos, setHeroBgPos] = useState({ x: hero.bgX ?? 50, y: hero.bgY ?? 50 })
  const [heroHeight, setHeroHeight] = useState(hero.minHeight ?? 680)
  const heroDragRef  = useRef<{ startX: number; startY: number; startBgX: number; startBgY: number } | null>(null)
  const heightDragRef = useRef<{ startY: number; startH: number } | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)

  const vars = { '--primary': meta.primaryColor, '--accent': meta.accentColor, fontFamily: meta.font } as React.CSSProperties

  const ctx: EditCtx = {
    editMode,
    onTextChange: onTextChange ?? (() => {}),
    onImageClick: onImageClick ?? (() => {}),
    onUpdate:     onUpdate     ?? (() => {}),
    setFocusedEl,
  }

  // Hero bg drag
  useEffect(() => {
    if (rearrangeMode) return
    const onMove = (e: MouseEvent) => {
      if (!heroDragRef.current || !heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      setHeroBgPos({
        x: Math.max(0, Math.min(100, heroDragRef.current.startBgX - (e.clientX - heroDragRef.current.startX) / rect.width * 100)),
        y: Math.max(0, Math.min(100, heroDragRef.current.startBgY - (e.clientY - heroDragRef.current.startY) / rect.height * 100)),
      })
    }
    const onUp = () => {
      heroDragRef.current = null
      setHeroBgPos(p => { onUpdate?.('hero.bgX', p.x); onUpdate?.('hero.bgY', p.y); return p })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [rearrangeMode, onUpdate])

  // Hero height drag
  useEffect(() => {
    if (!heightDragRef.current) return
    const onMove = (e: MouseEvent) => {
      if (!heightDragRef.current) return
      setHeroHeight(Math.max(300, heightDragRef.current.startH + e.clientY - heightDragRef.current.startY))
    }
    const onUp = () => {
      heightDragRef.current = null
      setHeroHeight(h => { onUpdate?.('hero.minHeight', h); return h })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  })

  // ── Canvas position helpers ─────────────────────────────────────────────────

  const savedPos = (content.positions ?? {}) as Record<string, CanvasPos>
  const pos = (id: string, fallback: CanvasPos): CanvasPos => savedPos[id] ?? initPositions[id] ?? fallback
  const moveEl = (id: string, p: CanvasPos) => onUpdate?.('positions', { ...savedPos, [id]: p })

  // ── Canvas render ────────────────────────────────────────────────────────────

  if (rearrangeMode) {
    const H = heroHeight
    const canvasBg: React.CSSProperties = {
      position: 'absolute', inset: 0, top: 0, left: 0, right: 0, height: H,
      background: hero.image
        ? `url(${hero.image}) ${heroBgPos.x}% ${heroBgPos.y}% / cover no-repeat`
        : meta.primaryColor,
      zIndex: 0,
    }

    // Section zone markers
    const zone = (label: string, y: number, h: number, color: string) => (
      <div style={{
        position: 'absolute', left: 0, right: 0, top: y, height: h,
        background: color, borderTop: '1px dashed #d0d0d0', pointerEvents: 'none',
        display: 'flex', alignItems: 'flex-start', paddingLeft: 8, paddingTop: 4,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', background: '#f8f9fa', padding: '2px 6px', borderRadius: 4 }}>{label}</span>
      </div>
    )

    return (
      <div style={vars} className="site-canvas">
        {/* Hero bg */}
        <div className="canvas-bg-band" style={canvasBg}
          onMouseDown={e => {
            e.preventDefault()
            heroDragRef.current = { startX: e.clientX, startY: e.clientY, startBgX: heroBgPos.x, startBgY: heroBgPos.y }
          }}
        >
          <div className="canvas-bg-hint">Hero-Bild ziehen um Position anzupassen</div>
        </div>

        {/* Zone markers */}
        {zone('Hero', 0, H, 'transparent')}
        {zone('Trust Strip', H, 90, 'rgba(17,17,17,.04)')}
        {zone('Kategorien', H + 90, 720, 'rgba(0,153,204,.02)')}
        {zone('Produkte', H + 810, 830, 'rgba(179,230,0,.03)')}
        {zone('Vorteile', H + 1640, 740, 'rgba(0,153,204,.02)')}
        {zone('Neuigkeiten', H + 2380, 580, 'rgba(179,230,0,.03)')}
        {zone('Standort', H + 2960, 500, 'rgba(0,0,0,.02)')}
        {zone('Footer', H + 3460, 250, 'rgba(17,17,17,.04)')}

        {/* NAV */}
        <header className="site-nav" style={{ position: 'sticky', top: 0, zIndex: 200 }}>
          <div className="site-nav-inner">
            {nav.logo ? <img src={nav.logo} alt={nav.brand} className="site-logo-img" /> : <span className="site-logo-text">{nav.brand}</span>}
            <nav className="site-main-nav">{nav.links.map((l, i) => <a key={i} href={l.href}>{l.label}</a>)}</nav>
            <div className="site-nav-right">
              {nav.phone && <span className="site-nav-phone">{nav.phone}</span>}
              {nav.ctaLabel && <a href={nav.ctaHref ?? '#'} className="site-nav-cta">{nav.ctaLabel}</a>}
            </div>
          </div>
        </header>

        {/* HERO ELEMENTS */}
        {hero.tag && (
          <CanvasEl id="hero.tag" pos={pos('hero.tag', { x: 80, y: 200 })} onMove={p => moveEl('hero.tag', p)} minWidth={300} noPad label="Hero Tag">
            <div className="site-hero-tag" dangerouslySetInnerHTML={{ __html: hero.tag }} />
          </CanvasEl>
        )}
        <CanvasEl id="hero.headline" pos={pos('hero.headline', { x: 80, y: 260 })} onMove={p => moveEl('hero.headline', p)} minWidth={400} noPad label="Überschrift">
          <h1 className="site-hero-h1" dangerouslySetInnerHTML={{ __html: hero.headline }} />
        </CanvasEl>
        <CanvasEl id="hero.subheadline" pos={pos('hero.subheadline', { x: 80, y: 390 })} onMove={p => moveEl('hero.subheadline', p)} minWidth={400} noPad label="Unterüberschrift">
          <p className="site-hero-sub" dangerouslySetInnerHTML={{ __html: hero.subheadline }} />
        </CanvasEl>
        <CanvasEl id="hero.cta" pos={pos('hero.cta', { x: 80, y: 490 })} onMove={p => moveEl('hero.cta', p)} minWidth={280} label="Buttons">
          <div className="site-hero-btns">
            <a className="site-btn-lime-lg" dangerouslySetInnerHTML={{ __html: hero.ctaLabel }} />
            {hero.ctaSecLabel && <a className="site-btn-ghost-lg" dangerouslySetInnerHTML={{ __html: hero.ctaSecLabel }} />}
          </div>
        </CanvasEl>

        {/* TRUST ITEMS */}
        {(trust?.items ?? []).map((t, i) => (
          <CanvasEl key={t.id} id={`trust.items.${i}`} pos={pos(`trust.items.${i}`, { x: 60 + i * 290, y: H + 20 })} onMove={p => moveEl(`trust.items.${i}`, p)} minWidth={240} label={`Trust ${i+1}`}>
            <div className="canvas-trust-item">
              <TrustIcon icon={t.icon} />
              <span><strong>{t.bold}</strong> {t.text}</span>
            </div>
          </CanvasEl>
        ))}

        {/* CATEGORIES TITLE */}
        <CanvasEl id="categories.title" pos={pos('categories.title', { x: 80, y: H + 140 })} onMove={p => moveEl('categories.title', p)} minWidth={300} noPad label="Kategorien Titel">
          <h2 className="canvas-section-h2" dangerouslySetInnerHTML={{ __html: categories?.title ?? '' }} />
        </CanvasEl>

        {/* CATEGORY CARDS */}
        {(categories?.items ?? []).map((c, i) => (
          <CanvasEl key={c.id} id={`categories.items.${i}`} pos={pos(`categories.items.${i}`, { x: 40 + (i % 3) * 388, y: H + 230 + Math.floor(i / 3) * 270 })} onMove={p => moveEl(`categories.items.${i}`, p)} minWidth={360} label={c.name}>
            <div className="canvas-cat-card">
              {c.image && <img src={c.image} alt={c.name} style={{ width: '100%', height: 120, objectFit: 'contain', background: '#f0f4f0', borderRadius: 6, padding: 8 }} />}
              <div style={{ padding: '8px 12px' }}>
                <div className="canvas-cat-name">{c.name}</div>
                <div className="canvas-cat-sub">{c.sub}</div>
              </div>
            </div>
          </CanvasEl>
        ))}

        {/* PRODUCTS TITLE */}
        <CanvasEl id="products.title" pos={pos('products.title', { x: 80, y: H + 870 })} onMove={p => moveEl('products.title', p)} minWidth={300} noPad label="Produkte Titel">
          <h2 className="canvas-section-h2" dangerouslySetInnerHTML={{ __html: products?.title ?? '' }} />
        </CanvasEl>

        {/* PRODUCT CARDS */}
        {(products?.items ?? []).map((p, i) => (
          <CanvasEl key={p.id} id={`products.items.${i}`} pos={pos(`products.items.${i}`, { x: 40 + (i % 3) * 388, y: H + 960 + Math.floor(i / 3) * 390 })} onMove={pp => moveEl(`products.items.${i}`, pp)} minWidth={360} label={p.name}>
            <div className="canvas-product-card">
              {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'contain', background: '#f7f7f7', borderRadius: 6, padding: 12 }} /> : <div style={{ height: 80, background: '#f0f0f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12 }}>Kein Bild</div>}
              <div style={{ padding: '10px 12px' }}>
                {p.badge && <div className="canvas-pcard-badge">{p.badge}</div>}
                <div className="canvas-pcard-brand">{p.category}</div>
                <div className="canvas-pcard-name">{p.name}</div>
                <div className="canvas-pcard-price">{p.price}</div>
              </div>
            </div>
          </CanvasEl>
        ))}

        {/* USP TITLE */}
        <CanvasEl id="usp.title" pos={pos('usp.title', { x: 80, y: H + 1700 })} onMove={p => moveEl('usp.title', p)} minWidth={300} noPad label="Vorteile Titel">
          <h2 className="canvas-section-h2" dangerouslySetInnerHTML={{ __html: usp?.title ?? '' }} />
        </CanvasEl>

        {/* USP CARDS */}
        {(usp?.items ?? []).map((u, i) => (
          <CanvasEl key={u.id} id={`usp.items.${i}`} pos={pos(`usp.items.${i}`, { x: 40 + (i % 3) * 388, y: H + 1780 + Math.floor(i / 3) * 190 })} onMove={p => moveEl(`usp.items.${i}`, p)} minWidth={360} label={u.title}>
            <div className="canvas-usp-card">
              <h3>{u.title}</h3>
              <p>{u.description}</p>
            </div>
          </CanvasEl>
        ))}

        {/* NEWS TITLE */}
        <CanvasEl id="news.title" pos={pos('news.title', { x: 80, y: H + 2440 })} onMove={p => moveEl('news.title', p)} minWidth={300} noPad label="Neuigkeiten Titel">
          <h2 className="canvas-section-h2" dangerouslySetInnerHTML={{ __html: news?.title ?? '' }} />
        </CanvasEl>

        {/* NEWS CARDS */}
        {(news?.items ?? []).map((n, i) => (
          <CanvasEl key={n.id} id={`news.items.${i}`} pos={pos(`news.items.${i}`, { x: 40 + i * 388, y: H + 2520 })} onMove={p => moveEl(`news.items.${i}`, p)} minWidth={360} label={n.title}>
            <div className="canvas-news-card">
              <div className="canvas-news-date">{n.date}</div>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
            </div>
          </CanvasEl>
        ))}

        {/* CONTACT BLOCK */}
        <CanvasEl id="contact.block" pos={pos('contact.block', { x: 640, y: H + 3010 })} onMove={p => moveEl('contact.block', p)} minWidth={520} label="Kontakt">
          <div className="canvas-contact-block">
            <h2>{contact?.title}</h2>
            {contact?.phone && <div className="canvas-citem"><IconPhone /> <a href={`tel:${contact.phone}`}>{contact.phone}</a></div>}
            {contact?.email && <div className="canvas-citem"><IconMail /> <a href={`mailto:${contact.email}`}>{contact.email}</a></div>}
            {contact?.address && <div className="canvas-citem"><IconLocation /> <span>{contact.address}</span></div>}
          </div>
        </CanvasEl>

        {/* FOOTER */}
        <CanvasEl id="footer.block" pos={pos('footer.block', { x: 0, y: H + 3520 })} onMove={p => moveEl('footer.block', p)} minWidth={900} noPad label="Footer">
          <footer className="site-footer" style={{ position: 'static', borderRadius: 8 }}>
            <div className="site-footer-bottom">
              <span>{footer?.brand} — {footer?.tagline}</span>
              <div className="site-footer-links">
                {(footer?.links ?? []).map((l, i) => <a key={i} href={l.href}>{l.label}</a>)}
              </div>
              <span>{footer?.copyright}</span>
            </div>
          </footer>
        </CanvasEl>
      </div>
    )
  }

  // ── Normal / Edit render ─────────────────────────────────────────────────────

  const filteredProducts = activeTab === 'Alle'
    ? (products?.items ?? [])
    : (products?.items ?? []).filter(p => p.category === activeTab)

  const heroStyle: React.CSSProperties = {
    minHeight: heroHeight,
    ...(hero.image ? { backgroundImage: `url(${hero.image})`, backgroundPosition: `${heroBgPos.x}% ${heroBgPos.y}%` } : {}),
  }

  return (
    <Ctx.Provider value={ctx}>
      <div style={vars} className="site" data-theme={theme}>
        {editMode && <FormatToolbar anchorEl={focusedEl} />}

        {/* ── NAV ──────────────────────────────────────────────────────── */}
        <header className="site-nav">
          <div className="site-nav-inner">
            {nav.logo
              ? <EImg field="nav.logo" src={nav.logo} alt={nav.brand} className="site-logo-img" />
              : <E field="nav.brand" value={nav.brand} as="span" className="site-logo-text" />
            }
            <nav className="site-main-nav">
              {nav.links.map((l, i) => (
                <E key={i} field={`nav.links.${i}.label`} value={l.label} as="a" href={l.href} />
              ))}
            </nav>
            <div className="site-nav-right">
              <div className="site-nav-desktop">
                <LanguageToggle />
                <ThemeToggle theme={theme} setTheme={setTheme} />
                {nav.phone && (
                  <a href={`tel:${nav.phone}`} className="site-nav-phone">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.1-.45c.908.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <E field="nav.phone" value={nav.phone} as="span" />
                  </a>
                )}
                {nav.ctaLabel && (
                  <E field="nav.ctaLabel" value={nav.ctaLabel} as="a" href={nav.ctaHref ?? '#'} className="site-nav-cta" />
                )}
              </div>
              <button className="site-nav-burger" aria-label={t.openMenu} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
                <IconMenu />
              </button>
            </div>
          </div>
        </header>

        {/* ── MOBILE DRAWER (hamburger menu) ───────────────────────────── */}
        <div className={`site-mobile-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
        <aside className={`site-mobile-drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
          <div className="site-mobile-drawer-top">
            <span className="site-mobile-drawer-brand">{nav.brand}</span>
            <button className="site-mobile-close" aria-label={t.closeMenu} onClick={() => setMenuOpen(false)}>
              <IconClose />
            </button>
          </div>
          <nav className="site-mobile-links">
            {nav.links.map((l, i) => (
              <a key={i} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
          </nav>
          <div className="site-mobile-actions">
            <div>
              <div className="site-mobile-theme-label">{t.language}</div>
              <div className="site-mobile-theme-row">
                <LanguageToggle />
              </div>
            </div>
            <div>
              <div className="site-mobile-theme-label">{t.colorScheme}</div>
              <div className="site-mobile-theme-row">
                <ThemeToggle theme={theme} setTheme={setTheme} />
              </div>
            </div>
            {nav.phone && (
              <a href={`tel:${nav.phone}`} className="site-mobile-phone" onClick={() => setMenuOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.1-.45c.908.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {nav.phone}
              </a>
            )}
            {nav.ctaLabel && (
              <a href={nav.ctaHref ?? '#'} className="site-mobile-cta" onClick={() => setMenuOpen(false)}>{nav.ctaLabel}</a>
            )}
          </div>
        </aside>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section
          className="site-hero"
          style={heroStyle}
          ref={heroRef as React.RefObject<HTMLElement>}
          onMouseDown={e => {
            if (!editMode) return
            heroDragRef.current = { startX: e.clientX, startY: e.clientY, startBgX: heroBgPos.x, startBgY: heroBgPos.y }
          }}
        >
          {editMode && (
            <div className="site-hero-controls">
              <button className="site-hero-swap-btn" onClick={() => onImageClick?.('hero.image')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Bild ändern
              </button>
            </div>
          )}
          <div className="site-hero-inner">
            {hero.tag && (
              <div className="site-hero-tag-wrap">
                <E field="hero.tag" value={hero.tag} as="div" className="site-hero-tag" />
              </div>
            )}
            <E field="hero.headline" value={hero.headline} as="h1" className="site-hero-h1" />
            <E field="hero.subheadline" value={hero.subheadline} as="p" className="site-hero-sub" />
            <div className="site-hero-btns">
              <E field="hero.ctaLabel" value={hero.ctaLabel} as="a" href={hero.ctaHref} className="site-btn-lime-lg" />
              {hero.ctaSecLabel && <E field="hero.ctaSecLabel" value={hero.ctaSecLabel} as="a" href={hero.ctaSecHref ?? '#'} className="site-btn-ghost-lg" />}
            </div>
          </div>
          {editMode && (
            <div className="hero-resize-handle" onMouseDown={e => { e.preventDefault(); heightDragRef.current = { startY: e.clientY, startH: heroHeight } }} />
          )}
        </section>

        {/* ── TRUST STRIP ──────────────────────────────────────────────── */}
        {(trust?.items?.length ?? 0) > 0 && (
          <div className="site-trust" id="trust">
            {trust.items.map((t) => (
              <div key={t.id} className="site-trust-item">
                <TrustIcon icon={t.icon} />
                <span>
                  <strong dangerouslySetInnerHTML={{ __html: t.bold }} />
                  {' '}<span dangerouslySetInnerHTML={{ __html: t.text }} />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── CATEGORIES ───────────────────────────────────────────────── */}
        {(categories?.items?.length ?? 0) > 0 && (
          <section className="site-section site-categories" id="categories">
            {categories.eyebrow && <div className="site-eyebrow">{categories.eyebrow}</div>}
            <E field="categories.title" value={categories.title} as="h2" className="site-section-title" />
            <div className="site-cat-grid">
              {categories.items.map((c, i) => (
                <div
                  key={c.id}
                  className={`site-cat-card ${!editMode ? 'clickable' : ''}`}
                  {...(!editMode ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => drillToSessions(c, i),
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drillToSessions(c, i) } },
                  } : {})}
                >
                  <EImg field={`categories.items.${i}.image`} src={c.image} alt={c.name} className="site-cat-img" />
                  <div className="site-cat-overlay">
                    <E field={`categories.items.${i}.name`} value={c.name} as="div" className="site-cat-name" />
                    <E field={`categories.items.${i}.sub`} value={c.sub} as="div" className="site-cat-sub" />
                    {!editMode && <span className="site-cat-arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── PRODUCTS ─────────────────────────────────────────────────── */}
        {(products?.items?.length ?? 0) > 0 && (
          <section className="site-section site-products" id="products">
            <div className="site-products-top">
              <E field="products.title" value={products.title} as="h2" className="site-products-h2" />
              {!editMode && (products?.tabs?.length ?? 0) > 1 && (
                <div className="site-tabs">
                  {products.tabs.map(tab => (
                    <button
                      key={tab}
                      className={`site-tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >{tab}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="site-product-grid">
              {(editMode ? products.items : filteredProducts).map((p, i) => (
                <div
                  key={p.id}
                  className={`site-pcard ${!editMode ? 'clickable' : ''}`}
                  {...(!editMode ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => setModalProduct(p),
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalProduct(p) } },
                  } : {})}
                >
                  <div className="site-pcard-img">
                    {p.badge && <div className="site-pcard-badge">{p.badge}</div>}
                    <EImg field={`products.items.${i}.image`} src={p.image} alt={p.name} className="site-pcard-photo" />
                  </div>
                  <div className="site-pcard-body">
                    <div className="site-pcard-brand">{p.category}</div>
                    <E field={`products.items.${i}.name`} value={p.name} as="div" className="site-pcard-name" />
                    {(p.specs?.length ?? 0) > 0 && (
                      <div className="site-pcard-specs">
                        {p.specs!.map((s, si) => <span key={si} className="site-spec">{s}</span>)}
                      </div>
                    )}
                    <E field={`products.items.${i}.description`} value={p.description} as="div" className="site-pcard-desc" />
                    <div className="site-pcard-foot">
                      <E field={`products.items.${i}.price`} value={p.price} as="div" className="site-pcard-price" />
                      <a href={`mailto:${contact?.email ?? ''}`} className="site-pcard-cta" onClick={e => e.stopPropagation()}>{t.book}</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── USP ──────────────────────────────────────────────────────── */}
        {(usp?.items?.length ?? 0) > 0 && (
          <section className="site-section site-section-alt site-usp" id="usp">
            {usp.eyebrow && <div className="site-eyebrow">{usp.eyebrow}</div>}
            <E field="usp.title" value={usp.title} as="h2" className="site-section-title" />
            <div className="site-usp-grid">
              {usp.items.map((u, i) => (
                <div key={u.id} className={`site-usp-card ${i % 2 === 1 ? 'accent' : ''}`}>
                  <E field={`usp.items.${i}.title`} value={u.title} as="h3" />
                  <E field={`usp.items.${i}.description`} value={u.description} as="p" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── NEWS ─────────────────────────────────────────────────────── */}
        {(news?.items?.length ?? 0) > 0 && (
          <section className="site-section site-news" id="news">
            {news.eyebrow && <div className="site-eyebrow">{news.eyebrow}</div>}
            <E field="news.title" value={news.title} as="h2" className="site-section-title" />
            <div className="site-news-grid">
              {news.items.map((n, i) => (
                <div key={n.id} className="site-news-card">
                  {n.image && <img src={n.image} alt={n.title} className="site-news-img" />}
                  <div className="site-news-body">
                    <div className="site-news-date">{new Date(n.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <E field={`news.items.${i}.title`} value={n.title} as="h3" className="site-news-title" />
                    <E field={`news.items.${i}.body`} value={n.body} as="p" className="site-news-text" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── LOCATION ─────────────────────────────────────────────────── */}
        <section className="site-location" id="location">
          {contact?.mapSrc && (
            <div className="site-map">
              <iframe src={contact.mapSrc} allowFullScreen loading="lazy" title="Standort" />
            </div>
          )}
          <div className="site-location-info">
            {contact?.photo && (
              <div className="site-contact-photo">
                <EImg field="contact.photo" src={contact.photo} alt="Niki" />
              </div>
            )}
            <E field="contact.title" value={contact?.title ?? ''} as="h2" className="site-location-h2" />
            {contact?.subtitle && <E field="contact.subtitle" value={contact.subtitle} as="p" className="site-location-sub" />}
            <div className="site-cinfo-list">
              {contact?.phone && (
                <div className="site-cinfo-item">
                  <IconPhone />
                  <E field="contact.phone" value={contact.phone} as="a" href={`tel:${contact.phone}`} />
                </div>
              )}
              {contact?.email && (
                <div className="site-cinfo-item">
                  <IconMail />
                  <E field="contact.email" value={contact.email} as="a" href={`mailto:${contact.email}`} />
                </div>
              )}
              {contact?.address && (
                <div className="site-cinfo-item">
                  <IconLocation />
                  <E field="contact.address" value={contact.address} as="span" />
                </div>
              )}
            </div>
            {contact?.formEnabled && !editMode ? (
              <ContactForm email={contact?.email ?? ''} />
            ) : (
              <a href={`mailto:${contact?.email ?? ''}`} className="site-btn-lime-solid">{t.send}</a>
            )}
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer className="site-footer">
          {(footer?.cols?.length ?? 0) > 0 && (
            <div className="site-footer-grid">
              <div className="site-footer-brand">
                {nav.logo && <img src={nav.logo} alt={footer?.brand} className="site-footer-logo" />}
                <E field="footer.brand" value={footer?.brand ?? ''} as="strong" className="site-footer-brand-name" />
                {footer?.description && <E field="footer.description" value={footer.description} as="p" className="site-footer-brand-desc" />}
              </div>
              {footer.cols.map((col, ci) => (
                <div key={ci} className="site-footer-col">
                  <h4>{col.title}</h4>
                  {col.links.map((l, li) => <a key={li} href={l.href}>{l.label}</a>)}
                </div>
              ))}
            </div>
          )}
          <div className="site-footer-bottom">
            <E field="footer.copyright" value={footer?.copyright ?? ''} as="span" />
            <div className="site-footer-links">
              {(footer?.links ?? []).map((l, i) => (
                <E key={i} field={`footer.links.${i}.label`} value={l.label} as="a" href={l.href} />
              ))}
            </div>
          </div>
        </footer>

        {/* ── SESSION DETAIL MODAL (tier 3) ────────────────────────────── */}
        {modalProduct && !editMode && (
          <div className="site-modal-scrim" onClick={() => setModalProduct(null)} role="dialog" aria-modal="true" aria-label={modalProduct.name}>
            <div className="site-modal" onClick={e => e.stopPropagation()}>
              <button className="site-modal-close" aria-label={t.close} onClick={() => setModalProduct(null)}><IconClose /></button>
              {modalProduct.image && (
                <div className="site-modal-img"><img src={modalProduct.image} alt={modalProduct.name} /></div>
              )}
              <div className="site-modal-body">
                {modalProduct.category && <div className="site-modal-brand">{modalProduct.category}</div>}
                <h3 className="site-modal-title" dangerouslySetInnerHTML={{ __html: modalProduct.name }} />
                {(modalProduct.specs?.length ?? 0) > 0 && (
                  <>
                    <div className="site-modal-label">{t.whatsIncluded}</div>
                    <div className="site-modal-specs">
                      {modalProduct.specs!.map((s, si) => <span key={si} className="site-spec">{s}</span>)}
                    </div>
                  </>
                )}
                <p className="site-modal-desc" dangerouslySetInnerHTML={{ __html: modalProduct.description }} />
                <div className="site-modal-foot">
                  <div className="site-modal-price" dangerouslySetInnerHTML={{ __html: modalProduct.price }} />
                  <a href={`mailto:${contact?.email ?? ''}?subject=${encodeURIComponent(`${t.mailSubject}`)}`} className="site-btn-lime-lg" onClick={() => setModalProduct(null)}>{t.bookTrial}</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── WHATSAPP FLOAT ───────────────────────────────────────────── */}
        {whatsapp?.enabled && !editMode && (
          <WhatsAppButton number={whatsapp.number} message={whatsapp.message} />
        )}
      </div>
    </Ctx.Provider>
  )
}
