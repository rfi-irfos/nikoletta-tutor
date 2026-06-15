import { useState, useEffect, useCallback, useRef } from 'react'
import type { SiteContent } from '../types/content'
import { ghRead, ghWrite, b64Encode, CONTENT_PATH, UPLOADS_DIR } from '../lib/github'

export function useContent() {
  const [content, setContent]   = useState<SiteContent | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const shaRef = useRef<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}content.json`)
        if (!res.ok) throw new Error('missing')
        setContent(await res.json())
      } catch {
        const { defaultContent } = await import('../types/defaultContent')
        setContent(defaultContent)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Lazily prime the SHA so we can update (not just create) the file
  const ensureSha = useCallback(async () => {
    if (shaRef.current) return shaRef.current
    try {
      const file = await ghRead(CONTENT_PATH)
      shaRef.current = file.sha
    } catch {
      shaRef.current = null  // file doesn't exist yet — first save creates it
    }
    return shaRef.current
  }, [])

  const save = useCallback(async (updated: SiteContent): Promise<boolean> => {
    setSaving(true)
    try {
      const sha = await ensureSha()
      const b64 = b64Encode(JSON.stringify(updated, null, 2))
      const file = await ghWrite(CONTENT_PATH, b64, sha, 'content: update via admin panel')
      shaRef.current = file?.sha ?? null
      setContent(updated)
      return true
    } catch (e) {
      console.error('Save failed:', e)
      return false
    } finally {
      setSaving(false)
    }
  }, [ensureSha])

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const b64 = (reader.result as string).split(',')[1]
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
          const filename = `${Date.now()}-${safe}`
          const path = `${UPLOADS_DIR}/${filename}`
          await ghWrite(path, b64, null, `upload: ${filename}`)
          resolve(`uploads/${filename}`)
        } catch (e) {
          console.error('Upload failed:', e)
          resolve(null)
        }
      }
      reader.readAsDataURL(file)
    })
  }, [])

  return { content, loading, saving, save, uploadImage }
}
