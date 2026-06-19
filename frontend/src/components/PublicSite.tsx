import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { SiteContent, SectionId, CanvasPos, ProductItem, NewsItem } from '../types/content'
import type { Testimonial } from '../types/testimonials'
import { useTheme, type Theme } from '../hooks/useTheme'
import { useLang, type Lang } from '../hooks/useLang'

// Convert server-side paths to hash routing so GitHub Pages never 404s on legal links
function safeHref(href: string): string {
  return href.startsWith('/') && !href.startsWith('//') ? `#p${href}` : href
}

// ── Language name i18n (stored canonical = English, displayed per UI lang) ───
const LANG_NAMES: Record<string, Record<Lang, string>> = {
  english:    { en: 'English',    de: 'Englisch',    hu: 'Angol' },
  german:     { en: 'German',     de: 'Deutsch',     hu: 'Német' },
  hungarian:  { en: 'Hungarian',  de: 'Ungarisch',   hu: 'Magyar' },
  french:     { en: 'French',     de: 'Französisch', hu: 'Francia' },
  spanish:    { en: 'Spanish',    de: 'Spanisch',    hu: 'Spanyol' },
  italian:    { en: 'Italian',    de: 'Italienisch', hu: 'Olasz' },
  dutch:      { en: 'Dutch',      de: 'Niederländisch', hu: 'Holland' },
  portuguese: { en: 'Portuguese', de: 'Portugiesisch',  hu: 'Portugál' },
}
function localizedLang(raw: string, lang: Lang): string {
  return LANG_NAMES[raw.toLowerCase().trim()]?.[lang] ?? raw
}

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
  const isEditingRef = useRef(false)
  const htmlRef = useRef({ __html: value })
  if (!isEditingRef.current) htmlRef.current = { __html: value }

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
    dangerouslySetInnerHTML: htmlRef.current,
    onFocus: (e: React.FocusEvent<HTMLElement>) => { isEditingRef.current = true; setFocusedEl(e.currentTarget) },
    onInput: (e: React.FormEvent<HTMLElement>) => { onTextChange(field, e.currentTarget.innerHTML) },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      isEditingRef.current = false
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
  const exec = (cmd: string, val?: string) => {
    anchorEl.focus()
    // produce CSS spans (not legacy <font>) so colour/size actually render
    if (cmd === 'foreColor' || cmd === 'fontSize') { try { document.execCommand('styleWithCSS', false, 'true') } catch { /* noop */ } }
    document.execCommand(cmd, false, val)
  }
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
  { id: 'hu', label: 'HU' },
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

// ── Star display ─────────────────────────────────────────────────────────────

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="site-review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <svg
          key={n}
          className={`site-review-star ${n <= (interactive ? (hover || rating) : rating) ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          onClick={interactive && onChange ? () => onChange(n) : undefined}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

// ── Reviews section (public fetch + submit form) ──────────────────────────────

function ReviewsSection({ editMode }: { editMode: boolean }) {
  const { t, lang } = useLang()
  const [reviews, setReviews] = useState<Testimonial[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', language: '', rating: 5, text: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  useEffect(() => {
    const bust = `?t=${Date.now()}`
    fetch(`testimonials.json${bust}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(setReviews)
      .catch(() => setReviews([]))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.text.trim()) return
    setStatus('sending')

    // Notify Niki via Web3Forms (no activation step required).
    // Review arrives in her inbox; she adds it via admin → Neue Bewertung.
    const key = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined
    if (key) {
      try {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: key,
            subject: `New review from ${form.name} (${form.rating}/5)`,
            name: form.name,
            email: form.email,
            replyto: form.email,
            language: form.language || '—',
            rating: `${form.rating}/5`,
            review: form.text,
          }),
        })
      } catch { /* best-effort */ }
    }

    setStatus('ok')
  }

  if (reviews.length === 0 && editMode) {
    return (
      <section className="site-section site-reviews" id="reviews">
        <div className="site-eyebrow">{t.reviewsEyebrow}</div>
        <h2 className="site-section-title">{t.reviewsTitle}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: 14 }}>No approved reviews yet — add them in Reviews tab.</p>
      </section>
    )
  }

  return (
    <section className="site-section site-reviews" id="reviews">
      <div className="site-eyebrow">{t.reviewsEyebrow}</div>
      <h2 className="site-section-title">{t.reviewsTitle}</h2>

      {reviews.length > 0 && <div className="site-reviews-grid">
        {reviews.map(r => (
          <div key={r.id} className="site-review-card">
            <Stars rating={r.rating} />
            <p className="site-review-text">"{r.text}"</p>
            <div className="site-review-footer">
              <span className="site-review-name">{r.name}</span>
              {r.language && <span className="site-review-lang">{localizedLang(r.language, lang)}</span>}
            </div>
          </div>
        ))}
      </div>}

      {!editMode && !showForm && status !== 'ok' && (
        <div className="site-reviews-cta">
          <button className="site-btn-ghost-lg" onClick={() => setShowForm(true)}>{t.reviewLeave}</button>
        </div>
      )}

      {!editMode && showForm && status !== 'ok' && (
        <form className="site-review-form" onSubmit={submit}>
          <div className="site-review-form-row">
            <div className="site-review-form-field">
              <label>{t.reviewName}</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t.reviewNameHint} />
            </div>
            <div className="site-review-form-field">
              <label>{t.reviewEmail}</label>
              <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t.reviewEmailHint} />
            </div>
          </div>
          <div className="site-review-form-field">
            <label>{t.reviewLanguage}</label>
            <input value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} placeholder="English" />
          </div>
          <div className="site-review-form-field">
            <label>{t.reviewRating}</label>
            <Stars rating={form.rating} interactive onChange={r => setForm(p => ({ ...p, rating: r }))} />
          </div>
          <div className="site-review-form-field">
            <label>{t.reviewText}</label>
            <textarea required rows={4} value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} placeholder={t.reviewTextPlaceholder} />
          </div>
          <div className="site-review-form-actions">
            <button type="button" className="site-btn-ghost-lg" onClick={() => setShowForm(false)} style={{ fontSize: 13 }}>Cancel</button>
            <button type="submit" className="site-btn-lime-solid" disabled={status === 'sending'}>
              {status === 'sending' ? t.reviewSubmitting : t.reviewSubmit}
            </button>
          </div>
          {status === 'err' && <p className="site-contact-form-err">{t.reviewError}</p>}
        </form>
      )}

      {!editMode && status === 'ok' && (
        <div className="site-review-success">{t.reviewSuccess}</div>
      )}
    </section>
  )
}

// ── Category icons ────────────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: string }) {
  const c = (category ?? '').toLowerCase()
  const cls = "site-cat-icon"
  if (c === 'english')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  if (c === 'german' || c === 'deutsch')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  if (c === 'exam prep' || c === 'prüfung' || c === 'vizsga')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  if (c === 'hungarian' || c === 'ungarisch' || c === 'magyar' || c === 'gyerekek')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  if (c === 'kids' || c === 'kinder' || c === 'kinder & jugendliche')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
  const { meta, nav, hero, trust, categories, products, usp, news, contact, whatsapp, footer, pricing, certificates } = content as typeof content & { pricing?: { title: string; body: string }; certificates?: { title?: string; items: Array<{ id: string; title: string; subtitle: string; file: string }> } }
  const hiddenSections = content.hiddenSections ?? []

  const [focusedEl, setFocusedEl] = useState<HTMLElement | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<ProductItem | null>(null)
  const [modalGalleryIdx, setModalGalleryIdx] = useState(0)
  const [modalArticle, setModalArticle] = useState<NewsItem | null>(null)
  const [modalCert, setModalCert] = useState<{ title: string; file: string } | null>(null)
  const [browseCatIdx, setBrowseCatIdx] = useState<number | null>(null)
  const [showSSPLogin, setShowSSPLogin] = useState(false)
  const [sspCode, setSspCode] = useState('')
  const [sspError, setSspError] = useState(false)

  const handleSSPLogin = () => {
    if (sspCode.trim().toLowerCase() === 'ssp2026') {
      localStorage.setItem('ssp_session', 'valid_' + Date.now())
      setShowSSPLogin(false)
      setSspCode('')
      setSspError(false)
      window.location.href = (import.meta.env.BASE_URL + 'research.html').replace('//', '/')
    } else {
      setSspError(true)
    }
  }
  const { theme, setTheme } = useTheme()
  const { t } = useLang()

  // Keep the product filter valid when the language (and its tab labels) changes
  useEffect(() => {
    const tabs = content.products?.tabs ?? []
    if (tabs.length && !tabs.includes(activeTab)) setActiveTab(tabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.products?.tabs])

  // When language changes, refresh open modal to show translated content
  useEffect(() => {
    if (!modalProduct) return
    const fresh = (content.products?.items ?? []).find(p => p.id === modalProduct.id)
    if (fresh) setModalProduct(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.products?.items])

  // Close modals on Escape; reset gallery index on open
  useEffect(() => {
    setModalGalleryIdx(0)
    if (!modalProduct) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalProduct(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalProduct])

  useEffect(() => {
    if (!modalCert) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalCert(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalCert])

  useEffect(() => {
    if (!modalArticle) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalArticle(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalArticle])
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
      if (!heroDragRef.current) return
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
                {(footer?.links ?? []).map((l, i) => <a key={i} href={safeHref(l.href)}>{l.label}</a>)}
              </div>
              <span>{footer?.copyright}</span>
            </div>
          </footer>
        </CanvasEl>
      </div>
    )
  }

  // ── Normal / Edit render ─────────────────────────────────────────────────────

  // First tab is always the "show all" tab, whatever its localized label is.
  const allTab = products?.tabs?.[0] ?? ''
  const filteredProducts = (activeTab === '' || activeTab === allTab)
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
              {/* compact lang toggle — always visible on mobile, hidden on desktop (desktop has it in site-nav-desktop) */}
              <div className="site-nav-lang-topbar">
                <LanguageToggle />
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
            // don't hijack the drag when the user is selecting/clicking editable
            // text, buttons or links — only drag from the bare hero background
            const el = e.target as HTMLElement
            if (el.isContentEditable || el.closest('.editable-text, .editable-img-wrap, button, a')) return
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
        {!hiddenSections.includes('trust') && (trust?.items?.length ?? 0) > 0 && (
          <div className="site-trust" id="trust">
            {trust.items.map((t, ti) => (
              <div key={t.id} className="site-trust-item">
                <TrustIcon icon={t.icon} />
                <span>
                  <E field={`trust.items.${ti}.bold`} value={t.bold} as="strong" />
                  {' '}<E field={`trust.items.${ti}.text`} value={t.text} as="span" />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── ABOUT ────────────────────────────────────────────────────── */}
        {content.about && (
          <section className="site-about" id="about">
            <div className="site-about-inner site-about-inner--no-photo">
              {content.about.eyebrow && <div className="site-eyebrow" data-cid="about.eyebrow">{content.about.eyebrow}</div>}
              <E field="about.headline" value={content.about.headline} as="h2" className="site-about-headline" />
              <E field="about.bio" value={content.about.bio} as="p" className="site-about-bio" />
              {(content.about.stats?.length ?? 0) > 0 && (
                <div className="site-about-stats">
                  {content.about.stats!.map((s, i) => (
                    <div key={i} className="site-about-stat">
                      <strong data-cid={`about.stats.${i}.value`}>{s.value}</strong>
                      <span data-cid={`about.stats.${i}.label`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── CATEGORIES / DRILL-DOWN BROWSER ──────────────────────────── */}
        {!hiddenSections.includes('categories') && (categories?.items?.length ?? 0) > 0 && (() => {
          // editMode: plain editable grid. Live: tier1 audiences -> tier2 that
          // audience's sessions (back + breadcrumb) -> tier3 detail modal.
          const browseCat = browseCatIdx != null ? categories.items[browseCatIdx] : null
          const browseSessions = browseCat
            ? (products?.items ?? []).filter(p => !browseCat.tab || p.category === browseCat.tab)
            : []
          return (
            <section className="site-section site-categories site-browser" id="categories">
              {(editMode || browseCatIdx == null) ? (
                <>
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
                          onClick: () => setBrowseCatIdx(i),
                          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBrowseCatIdx(i) } },
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
                </>
              ) : (
                <>
                  <div className="site-browser-header">
                    <button className="site-browser-back" onClick={() => setBrowseCatIdx(null)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                      {t.back}
                    </button>
                    <h2 className="site-browser-title">{browseCat?.name}</h2>
                    <nav className="site-browser-breadcrumb" aria-label="Breadcrumb">
                      <button onClick={() => setBrowseCatIdx(null)}>{categories.title}</button>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      <span>{browseCat?.name}</span>
                    </nav>
                  </div>
                  <div className="site-product-grid">
                    {browseSessions.map(p => (
                      <div key={p.id} className="site-pcard clickable" role="button" tabIndex={0}
                        onClick={() => setModalProduct(p)}
                        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalProduct(p) } }}>
                        <div className="site-pcard-img">
                          {p.badge && <div className="site-pcard-badge">{p.badge}</div>}
                          {p.image ? <img src={p.image} alt={p.name} className="site-pcard-photo" /> : null}
                        </div>
                        <div className="site-pcard-body">
                          <div className="site-pcard-brand"><CategoryIcon category={p.category} />{p.category}</div>
                          <div className="site-pcard-name" dangerouslySetInnerHTML={{ __html: p.name }} />
                          {(p.specs?.length ?? 0) > 0 && (
                            <div className="site-pcard-specs">{p.specs!.slice(0, 3).map((s, si) => <span key={si} className="site-spec">{s}</span>)}</div>
                          )}
                          <div className="site-pcard-desc" dangerouslySetInnerHTML={{ __html: p.description }} />
                          <div className="site-pcard-foot">
                            <div className="site-pcard-price" dangerouslySetInnerHTML={{ __html: p.price }} />
                            <a href={`mailto:${contact?.email ?? ''}`} className="site-pcard-cta" onClick={e => e.stopPropagation()}>{t.book}</a>
                          </div>
                        </div>
                      </div>
                    ))}
                    {browseSessions.length === 0 && <p className="site-browser-empty">—</p>}
                  </div>
                </>
              )}
            </section>
          )
        })()}

        {/* ── PRODUCTS ─────────────────────────────────────────────────── */}
        {!hiddenSections.includes('products') && (products?.items?.length ?? 0) > 0 && (
          <section className="site-section site-products" id="products">
            <div className="site-products-top">
              <E field="products.title" value={products.title} as="h2" className="site-products-h2" />
              {!editMode && (products?.tabs?.length ?? 0) > 1 && (
                <div className="site-tabs">
                  {products.tabs.map((tab, ti) => (
                    <button
                      key={tab}
                      className={`site-tab-btn ${activeTab === tab || (activeTab === '' && ti === 0) ? 'active' : ''}`}
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
                    <div className="site-pcard-brand">{!editMode && <CategoryIcon category={p.category} />}{p.category}</div>
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
        {!hiddenSections.includes('usp') && (usp?.items?.length ?? 0) > 0 && (
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

        {/* ── REVIEWS ──────────────────────────────────────────────────── */}
        <ReviewsSection editMode={editMode} />

        {/* ── NEWS ─────────────────────────────────────────────────────── */}
        {!hiddenSections.includes('news') && (news?.items?.length ?? 0) > 0 && (
          <section className="site-section site-news" id="news">
            {news.eyebrow && <div className="site-eyebrow">{news.eyebrow}</div>}
            <E field="news.title" value={news.title} as="h2" className="site-section-title" />
            <div className="site-news-grid">
              {news.items.map((n, i) => (
                <div
                  key={n.id}
                  className={`site-news-card ${!editMode ? 'clickable' : ''}`}
                  {...(!editMode ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => setModalArticle(n),
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalArticle(n) } },
                  } : {})}
                >
                  {n.image && <img src={n.image} alt={n.title} className="site-news-img" />}
                  <div className="site-news-body">
                    <div className="site-news-date">{new Date(n.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <E field={`news.items.${i}.title`} value={n.title} as="h3" className="site-news-title" />
                    <E field={`news.items.${i}.body`} value={n.body} as="p" className="site-news-text" />
                    {!editMode && <span className="site-news-read-more">{t.readMore} →</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        {pricing?.body && (
          <section className="site-section site-pricing" id="pricing" data-cid="pricing.title">
            <h2 className="site-section-title">{pricing.title}</h2>
            <div className="site-pricing-body">
              {pricing.body.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* ── LOCATION ─────────────────────────────────────────────────── */}
        {!hiddenSections.includes('location') && (
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
            {!editMode ? (
              <div className="site-contact-cta-row">
                {whatsapp?.enabled && whatsapp?.number && (
                  <a
                    href={`https://wa.me/${whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(whatsapp.message || t.send)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="site-contact-cta-wa">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.118 1.533 5.851L0 24l6.335-1.513A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.843 0-3.57-.49-5.062-1.346L2.5 21.5l.854-3.375A9.944 9.944 0 0 1 2 12c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {contact?.email && (
                  <a
                    href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contact.email)}&su=${encodeURIComponent(t.mailSubject)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="site-contact-cta-mail">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    E-Mail
                  </a>
                )}
              </div>
            ) : (
              <a href={`mailto:${contact?.email ?? ''}`} className="site-btn-lime-solid">{t.send}</a>
            )}
          </div>
        </section>
        )}

        {/* ── CERTIFICATES ─────────────────────────────────────────────── */}
        {(certificates?.items?.length ?? 0) > 0 && (
          <section className="site-section site-certificates" id="certificates" data-cid="certificates.items.0">
            {certificates!.title && <h2 className="site-section-title">{certificates!.title}</h2>}
            <div className="site-cert-grid">
              {certificates!.items.map(cert => (
                <button
                  key={cert.id}
                  className="site-cert-card"
                  onClick={() => !editMode && setModalCert({ title: cert.title, file: cert.file })}
                  aria-label={`${t.viewCertificate}: ${cert.title}`}
                >
                  <div className="site-cert-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <circle cx="12" cy="14" r="3"/>
                      <path d="M9.5 17.5 9 20l3-1 3 1-.5-2.5"/>
                    </svg>
                  </div>
                  <div className="site-cert-info">
                    <strong className="site-cert-title">{cert.title}</strong>
                    {cert.subtitle && <span className="site-cert-subtitle">{cert.subtitle}</span>}
                  </div>
                  <span className="site-cert-cta">{t.viewCertificate} →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── SILENT STUDENT PROJECT CTA ───────────────────────────────── */}
        <section className="site-ssp-cta" id="ssp" data-cid="ssp.title">
          <div className="site-ssp-inner">
            <E field="ssp.badge" value={content.ssp?.badge ?? 'Research Portal'} as="span" className="site-ssp-badge" />
            <E field="ssp.title" value={content.ssp?.title ?? 'The Silent Student Project'} as="h2" className="site-ssp-title" />
            <E field="ssp.sub" value={content.ssp?.sub ?? "Exploring the half of language learning nobody taught. If you are a language teacher and part of Nikoletta's early-access research, log in to access the reflection portal and your session data."} as="p" className="site-ssp-sub" />
            {editMode ? (
              <E field="ssp.button" value={content.ssp?.button ?? 'Member login →'} as="span" className="site-btn-ssp" />
            ) : (
              <button className="site-btn-ssp" onClick={() => { setShowSSPLogin(true); setSspError(false); setSspCode('') }}>
                {content.ssp?.button ?? 'Member login →'}
              </button>
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
                  {col.links.map((l, li) => (
                    <a key={li} href={safeHref(l.href)}
                      onClick={l.tab ? (e) => {
                        e.preventDefault()
                        setActiveTab(l.tab!)
                        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
                      } : undefined}>
                      {l.label}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="site-footer-bottom">
            <E field="footer.copyright" value={footer?.copyright ?? ''} as="span" />
            <div className="site-footer-links">
              {(footer?.links ?? []).map((l, i) => (
                <E key={i} field={`footer.links.${i}.label`} value={l.label} as="a" href={safeHref(l.href)} />
              ))}
            </div>
          </div>
        </footer>

        {/* ── SESSION DETAIL MODAL (tier 3) ────────────────────────────── */}
        {modalProduct && !editMode && (
          <div className="site-modal-scrim" onClick={() => setModalProduct(null)} role="dialog" aria-modal="true" aria-label={modalProduct.name}>
            <div className="site-modal" onClick={e => e.stopPropagation()}>
              <button className="site-modal-close" aria-label={t.close} onClick={() => setModalProduct(null)}><IconClose /></button>
              {(() => {
                const allImages = [modalProduct.image, ...(modalProduct.images ?? [])].filter(Boolean) as string[]
                const idx = Math.min(modalGalleryIdx, allImages.length - 1)
                return allImages.length > 0 ? (
                  <div className="site-modal-gallery">
                    <div className="site-modal-img"><img src={allImages[idx]} alt={modalProduct.name} /></div>
                    {allImages.length > 1 && (
                      <div className="site-modal-thumbs">
                        {allImages.map((src, gi) => (
                          <button key={gi} className={`site-modal-thumb ${idx === gi ? 'active' : ''}`} onClick={() => setModalGalleryIdx(gi)}>
                            <img src={src} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null
              })()}
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

        {/* ── ARTICLE MODAL ────────────────────────────────────────────── */}
        {modalArticle && !editMode && (
          <div className="site-modal-scrim" onClick={() => setModalArticle(null)} role="dialog" aria-modal="true" aria-label={modalArticle.title}>
            <div className="site-modal site-modal-article" onClick={e => e.stopPropagation()}>
              <button className="site-modal-close" aria-label={t.close} onClick={() => setModalArticle(null)}><IconClose /></button>
              {modalArticle.image && (
                <div className="site-modal-img"><img src={modalArticle.image} alt={modalArticle.title} /></div>
              )}
              <div className="site-modal-body">
                <div className="site-news-date">{new Date(modalArticle.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <h3 className="site-modal-title" dangerouslySetInnerHTML={{ __html: modalArticle.title }} />
                <div className="site-modal-article-body" dangerouslySetInnerHTML={{ __html: modalArticle.body }} />
              </div>
            </div>
          </div>
        )}

        {/* ── CERTIFICATE MODAL ────────────────────────────────────────── */}
        {modalCert && !editMode && (
          <div className="site-modal-scrim" onClick={() => setModalCert(null)} role="dialog" aria-modal="true" aria-label={modalCert.title}>
            <div className="site-modal site-modal-cert" onClick={e => e.stopPropagation()}>
              <button className="site-modal-close" aria-label={t.closeCertificate} onClick={() => setModalCert(null)}><IconClose /></button>
              <div className="site-modal-body">
                <h3 className="site-modal-title">{modalCert.title}</h3>
                {modalCert.file ? (
                  modalCert.file.match(/\.pdf$/i)
                    ? <iframe src={modalCert.file} className="site-cert-viewer-pdf" title={modalCert.title} />
                    : <img src={modalCert.file} alt={modalCert.title} className="site-cert-viewer-img" />
                ) : (
                  <p className="site-cert-placeholder">{t.noCertificateYet}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SSP LOGIN MODAL ──────────────────────────────────────────── */}
        {showSSPLogin && (
          <div className="site-modal-scrim" onClick={() => setShowSSPLogin(false)} role="dialog" aria-modal="true" aria-label={t.sspModalBadge}>
            <div className="site-modal site-ssp-modal" onClick={e => e.stopPropagation()}>
              <button className="site-modal-close" aria-label={t.close} onClick={() => setShowSSPLogin(false)}><IconClose /></button>
              <div className="site-modal-body">
                <div className="site-ssp-modal-badge">{t.sspModalBadge}</div>
                <h3 className="site-modal-title">{t.sspModalTitle}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.6 }}>
                  {t.sspModalSub}
                </p>
                <input
                  type="password"
                  className="site-ssp-code-input"
                  placeholder={t.sspCodePlaceholder}
                  value={sspCode}
                  onChange={e => { setSspCode(e.target.value); setSspError(false) }}
                  onKeyDown={e => e.key === 'Enter' && handleSSPLogin()}
                  autoFocus
                />
                {sspError && (
                  <p style={{ fontSize: 13, color: '#C0392B', marginTop: 8, marginBottom: 0 }}>
                    {t.sspInvalidCode}
                  </p>
                )}
                <button className="site-btn-ssp-submit" onClick={handleSSPLogin} style={{ marginTop: 16 }}>
                  {t.sspContinue}
                </button>
                <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 14, textAlign: 'center' }}>
                  {t.sspNotParticipant} <a href="mailto:nikoletta.tutor@gmail.com" style={{ color: 'var(--primary)' }}>{t.sspReachOut}</a>
                </p>
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
