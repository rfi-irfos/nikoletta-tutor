// GitHub Contents API wrapper — no dependencies, pure fetch

const BASE = 'https://api.github.com'

const OWNER   = import.meta.env.VITE_GH_OWNER   as string
const REPO    = import.meta.env.VITE_GH_REPO    as string
const TOKEN   = import.meta.env.VITE_GH_TOKEN   as string
const CONTENT_PATH  = (import.meta.env.VITE_GH_CONTENT_PATH  as string) || 'public/content.json'
const UPLOADS_DIR   = (import.meta.env.VITE_GH_UPLOADS_DIR   as string) || 'public/uploads'

export { CONTENT_PATH, UPLOADS_DIR }

// content.json (en) -> content.de.json (de). Keeps both languages side by side.
export function contentPathFor(lang: string): string {
  return lang === 'de' ? CONTENT_PATH.replace(/\.json$/, '.de.json') : CONTENT_PATH
}

function headers() {
  return {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

export interface GHFile {
  sha: string
  content: string  // base64-encoded
}

export async function ghRead(path: string): Promise<GHFile> {
  const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`GitHub API ${res.status} reading ${path}`)
  return res.json()
}

export async function ghWrite(path: string, b64: string, sha: string | null, message: string): Promise<GHFile> {
  const body: Record<string, string> = { message, content: b64 }
  if (sha) body.sha = sha
  const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status} writing ${path}: ${await res.text()}`)
  const data = await res.json()
  return data.content  // the updated file metadata
}

export function b64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

export function b64Decode(b64: string): string {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))))
}

export function isConfigured(): boolean {
  return !!(OWNER && REPO && TOKEN)
}
