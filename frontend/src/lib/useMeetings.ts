import { useState, useEffect } from 'react'
import { proxyRead, proxyWrite, b64Encode, b64Decode } from './github'
import type { Meeting } from '../types/meetings'

const MEETINGS_PATH = 'data/meetings.json'

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const file = await proxyRead(MEETINGS_PATH)
      setMeetings(JSON.parse(b64Decode(file.content)))
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
      await proxyWrite(MEETINGS_PATH, b64Encode(JSON.stringify(next, null, 2)))
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
