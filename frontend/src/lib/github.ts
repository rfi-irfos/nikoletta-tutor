// GitHub reads (public repo, no auth) + writes via the RFI write-proxy.
// The GitHub token lives ONLY on the proxy (a Fly secret) — never in the
// browser. The admin authenticates writes with the password they already type.

const BASE = 'https://api.github.com'
const PROXY = 'https://rfi-write-proxy.fly.dev'
const SITE = 'niki' // identifies this site to the proxy

export const OWNER   = import.meta.env.VITE_GH_OWNER   as string
export const REPO    = import.meta.env.VITE_GH_REPO    as string
const CONTENT_PATH  = (import.meta.env.VITE_GH_CONTENT_PATH  as string) || 'public/content.json'
const UPLOADS_DIR   = (import.meta.env.VITE_GH_UPLOADS_DIR   as string) || 'public/uploads'

export { CONTENT_PATH, UPLOADS_DIR }

// The admin password authenticates writes to the proxy. Kept in sessionStorage
// (this tab only); never a GitHub token, never persisted to disk.
const PW_KEY = 'admin_pw'
let _pw = ''
try { _pw = localStorage.getItem(PW_KEY) || '' } catch { /* no storage */ }
export function setAdminPw(p: string) { _pw = p; try { localStorage.setItem(PW_KEY, p) } catch { /* ignore */ } }
export function clearAdminPw() { _pw = ''; try { localStorage.removeItem(PW_KEY) } catch { /* ignore */ } }
export function hasAdminPw() { return !!_pw }

// content.json (en) -> content.de.json / content.hu.json. Languages side by side.
export function contentPathFor(lang: string): string {
  return lang === 'en' ? CONTENT_PATH : CONTENT_PATH.replace(/\.json$/, `.${lang}.json`)
}

const readHeaders = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }

export interface GHFile {
  sha: string
  content: string  // base64-encoded
}

// Reads are public (public repo) — no auth needed.
export async function ghRead(path: string): Promise<GHFile> {
  const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${path}`, { headers: readHeaders })
  if (!res.ok) throw new Error(`GitHub API ${res.status} reading ${path}`)
  return res.json()
}

// Writes go through the proxy, which holds the token server-side.
export async function ghWrite(path: string, b64: string, sha: string | null, message: string): Promise<GHFile> {
  const res = await fetch(`${PROXY}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: SITE, password: _pw, path, content: b64, sha: sha || undefined, message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Speichern fehlgeschlagen (${res.status}): ${data.error || 'Proxy-Fehler'}`)
  return { sha: data.sha, content: b64 }
}

export function b64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

export function b64Decode(b64: string): string {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))))
}

export function isConfigured(): boolean {
  return !!(OWNER && REPO && _pw)
}

// Sensitive data (students/leads/meetings) — stored on Fly volume, never in the public repo.
export async function proxyRead(filePath: string): Promise<GHFile> {
  const res = await fetch(`${PROXY}/data/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: SITE, password: _pw, path: filePath }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Lesen fehlgeschlagen (${res.status}): ${data.error || 'Proxy-Fehler'}`)
  return { sha: data.sha ?? null, content: data.content }
}

export async function proxyWrite(filePath: string, b64: string): Promise<void> {
  const res = await fetch(`${PROXY}/data/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: SITE, password: _pw, path: filePath, content: b64 }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Speichern fehlgeschlagen (${res.status}): ${data.error || 'Proxy-Fehler'}`)
}

export async function ghTraffic(endpoint: string): Promise<unknown> {
  // Traffic API needs push access; without a browser token this returns 403
  // and the Analytics tab just shows "no data" (unchanged behaviour).
  const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/traffic/${endpoint}`, { headers: readHeaders })
  if (!res.ok) throw new Error(`GH Traffic ${res.status}`)
  return res.json()
}
