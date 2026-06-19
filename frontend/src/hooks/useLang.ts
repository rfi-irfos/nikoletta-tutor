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
    readMore: 'Read article',
    reviewsTitle: 'What students say',
    reviewsEyebrow: 'Reviews',
    reviewLeave: 'Leave a review',
    reviewName: 'Your name',
    reviewNameHint: 'e.g. Maria S. (first name + initial is fine)',
    reviewLanguage: 'Language studied',
    reviewText: 'Your experience',
    reviewTextPlaceholder: 'Share what you learned, how Niki helped, and who you\'d recommend her to…',
    reviewEmail: 'Your email',
    reviewEmailHint: 'Not published — only used if Niki needs to reach you',
    reviewSubmit: 'Submit review',
    reviewSubmitting: 'Sending…',
    reviewSuccess: 'Thank you! Niki will review and publish your testimonial.',
    reviewError: 'Something went wrong. Please try again.',
    reviewRating: 'Rating',
    viewCertificate: 'View certificate',
    closeCertificate: 'Close',
    noCertificateYet: 'Certificate coming soon.',
    sspModalBadge: 'Research Portal',
    sspModalTitle: 'Member Access',
    sspModalSub: 'Enter your participant code to access the Silent Student Project reflection portal.',
    sspCodePlaceholder: 'Participant code',
    sspInvalidCode: 'Invalid code. Please check your participant code and try again.',
    sspContinue: 'Continue →',
    sspNotParticipant: 'Not a participant yet?',
    sspReachOut: 'Reach out to Nikoletta.',
    navResearch: 'Research',
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
    readMore: 'Artikel lesen',
    reviewsTitle: 'Was Schüler sagen',
    reviewsEyebrow: 'Bewertungen',
    reviewLeave: 'Bewertung hinterlassen',
    reviewName: 'Dein Name',
    reviewNameHint: 'z.B. Maria S. (Vorname + Initial reicht)',
    reviewLanguage: 'Gelernte Sprache',
    reviewText: 'Deine Erfahrung',
    reviewTextPlaceholder: 'Erzähl, was du gelernt hast, wie Niki geholfen hat und wem du sie empfehlen würdest…',
    reviewEmail: 'Deine E-Mail',
    reviewEmailHint: 'Wird nicht veröffentlicht — nur für eventuelle Rückfragen',
    reviewSubmit: 'Bewertung einreichen',
    reviewSubmitting: 'Senden…',
    reviewSuccess: 'Danke! Niki prüft deine Bewertung und veröffentlicht sie.',
    reviewError: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
    reviewRating: 'Bewertung',
    viewCertificate: 'Zertifikat ansehen',
    closeCertificate: 'Schließen',
    noCertificateYet: 'Zertifikat folgt in Kürze.',
    sspModalBadge: 'Forschungsportal',
    sspModalTitle: 'Mitglieder-Zugang',
    sspModalSub: 'Gib deinen Teilnehmer-Code ein, um auf das Reflexionsportal des Silent Student Project zuzugreifen.',
    sspCodePlaceholder: 'Teilnehmer-Code',
    sspInvalidCode: 'Ungültiger Code. Bitte überprüfe deinen Teilnehmer-Code und versuche es erneut.',
    sspContinue: 'Weiter →',
    sspNotParticipant: 'Noch kein Teilnehmer?',
    sspReachOut: 'Kontaktiere Nikoletta.',
    navResearch: 'Forschung',
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
    readMore: 'Cikk elolvasása',
    reviewsTitle: 'Mit mondanak a diákok',
    reviewsEyebrow: 'Vélemények',
    reviewLeave: 'Vélemény írása',
    reviewName: 'A neved',
    reviewNameHint: 'pl. Mária S. (keresztnév + kezdőbetű elegendő)',
    reviewLanguage: 'Tanult nyelv',
    reviewText: 'A tapasztalatod',
    reviewTextPlaceholder: 'Oszd meg, mit tanultál, hogyan segített Niki, és kinek ajánlanád…',
    reviewEmail: 'Az e-mail címed',
    reviewEmailHint: 'Nem kerül nyilvánosságra — csak visszajelzés esetén',
    reviewSubmit: 'Vélemény beküldése',
    reviewSubmitting: 'Küldés…',
    reviewSuccess: 'Köszönöm! Niki átnézi a véleményed, és közzéteszi.',
    reviewError: 'Valami hiba történt. Kérlek, próbáld újra.',
    reviewRating: 'Értékelés',
    viewCertificate: 'Tanúsítvány megtekintése',
    closeCertificate: 'Bezárás',
    noCertificateYet: 'A tanúsítvány hamarosan elérhető.',
    sspModalBadge: 'Kutatóportál',
    sspModalTitle: 'Tagi hozzáférés',
    sspModalSub: 'Add meg a résztvevői kódodat a Silent Student Project reflexiós portál eléréséhez.',
    sspCodePlaceholder: 'Résztvevői kód',
    sspInvalidCode: 'Érvénytelen kód. Ellenőrizd a résztvevői kódodat, és próbáld újra.',
    sspContinue: 'Tovább →',
    sspNotParticipant: 'Még nem résztvevő?',
    sspReachOut: 'Lépj kapcsolatba Nikolettával.',
    navResearch: 'Kutatás',
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
