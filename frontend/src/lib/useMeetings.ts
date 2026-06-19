import { useState, useEffect } from 'react'
import { ghRead, ghWrite, b64Encode, b64Decode, isConfigured } from './github'
import type { Meeting } from '../types/meetings'

// Out of the deployed public/ dir on purpose — CRM PII must not be served on Pages.
const MEETINGS_PATH = 'data/meetings.json'

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [sha, setSha] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      if (isConfigured()) {
        const file = await ghRead(MEETINGS_PATH)
        setSha(file.sha)
        setMeetings(JSON.parse(b64Decode(file.content)))
      } else {
        const res = await fetch('meetings.json')
        if (res.ok) setMeetings(await res.json())
      }
    } catch {
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }

  async function save(next: Meeting[]) {
    setSaving(true)
    setSaveError(false)
    try {
      const encoded = b64Encode(JSON.stringify(next, null, 2))
      const file = await ghWrite(MEETINGS_PATH, encoded, sha, 'update: meetings')
      setSha(file.sha)
      setMeetings(next)
    } catch (e) {
      console.error('Meeting save failed:', e)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  function add(m: Omit<Meeting, 'id' | 'created'>) {
    const next = [...meetings, { ...m, id: Date.now().toString(), created: new Date().toISOString() }]
    save(next)
  }

  function update(id: string, patch: Partial<Meeting>) {
    save(meetings.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  function remove(id: string) {
    save(meetings.filter(m => m.id !== id))
  }

  return { meetings, loading, saving, saveError, add, update, remove }
}
