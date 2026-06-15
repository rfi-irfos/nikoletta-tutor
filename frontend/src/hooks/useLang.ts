import { useState, useEffect } from 'react'

export type Lang = 'en' | 'de'

const KEY = 'niki-lang'
const EVENT = 'niki:lang-change'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'de') return saved
  } catch { /* localStorage unavailable */ }
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

// ── UI chrome strings (everything not stored in content.json) ─────────────────

export const UI = {
  en: {
    namePlaceholder: 'Your name',
    emailPlaceholder: 'Email address',
    phonePlaceholder: 'Phone (optional)',
    messagePlaceholder: "Tell me a bit about what you're working on",
    send: 'Send message',
    sending: 'Sending',
    success: 'Thank you! Niki will get back to you soon.',
    error: 'Something went wrong. Please try again or email directly.',
    colorScheme: 'Color scheme',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    language: 'Language',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeContrast: 'High contrast',
    mailSubject: 'Trial lesson request from',
  },
  de: {
    namePlaceholder: 'Dein Name',
    emailPlaceholder: 'E-Mail-Adresse',
    phonePlaceholder: 'Telefon (optional)',
    messagePlaceholder: 'Erzähl mir kurz, woran du arbeiten möchtest',
    send: 'Nachricht senden',
    sending: 'Wird gesendet',
    success: 'Danke! Niki meldet sich bald bei dir.',
    error: 'Etwas ist schiefgelaufen. Bitte versuch es erneut oder schreib direkt eine E-Mail.',
    colorScheme: 'Farbschema',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    language: 'Sprache',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeContrast: 'Hoher Kontrast',
    mailSubject: 'Anfrage für eine Probestunde von',
  },
} as const

export function useLang() {
  const [lang, setLangState] = useState<Lang>(detect)

  useEffect(() => {
    const handler = (e: Event) => setLangState((e as CustomEvent).detail as Lang)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const setLang = (l: Lang) => {
    try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
    document.documentElement.lang = l
    window.dispatchEvent(new CustomEvent(EVENT, { detail: l }))
  }

  return { lang, setLang, t: UI[lang] }
}
