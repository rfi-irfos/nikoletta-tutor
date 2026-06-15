import { useState, useEffect } from 'react'

export type Lang = 'en' | 'de' | 'hu'

const KEY = 'niki-lang'
const EVENT = 'niki:lang-change'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'de' || saved === 'hu') return saved
  } catch { /* localStorage unavailable */ }
  const nav = navigator.language?.toLowerCase() ?? ''
  if (nav.startsWith('de')) return 'de'
  if (nav.startsWith('hu')) return 'hu'
  return 'en'
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
    book: 'Book',
    bookTrial: 'Book a free trial',
    whatsIncluded: "What's included",
    close: 'Close',
    back: 'Back',
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
    book: 'Anfragen',
    bookTrial: 'Kostenlose Probestunde buchen',
    whatsIncluded: 'Das ist dabei',
    close: 'Schließen',
    back: 'Zurück',
  },
  hu: {
    namePlaceholder: 'A neved',
    emailPlaceholder: 'E-mail cím',
    phonePlaceholder: 'Telefon (nem kötelező)',
    messagePlaceholder: 'Írd le röviden, min szeretnél dolgozni',
    send: 'Üzenet küldése',
    sending: 'Küldés folyamatban',
    success: 'Köszönöm! Niki hamarosan jelentkezik nálad.',
    error: 'Valami hiba történt. Kérlek, próbáld újra, vagy írj közvetlenül e-mailt.',
    colorScheme: 'Színséma',
    openMenu: 'Menü megnyitása',
    closeMenu: 'Menü bezárása',
    language: 'Nyelv',
    themeLight: 'Világos',
    themeDark: 'Sötét',
    themeContrast: 'Magas kontraszt',
    mailSubject: 'Próbaóra iránti érdeklődés tőle:',
    book: 'Érdeklődés',
    bookTrial: 'Ingyenes próbaóra foglalása',
    whatsIncluded: 'Mit tartalmaz',
    close: 'Bezárás',
    back: 'Vissza',
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
