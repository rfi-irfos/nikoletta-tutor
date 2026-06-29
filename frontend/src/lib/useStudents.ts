import { useState, useEffect } from 'react'
import { proxyRead, proxyWrite, b64Encode, b64Decode } from './github'
import type { Student } from '../types/students'

const STUDENTS_PATH = 'data/students.json'

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const file = await proxyRead(STUDENTS_PATH)
      setStudents(JSON.parse(b64Decode(file.content)))
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  async function save(next: Student[]) {
    setSaving(true)
    setSaveError(false)
    try {
      await proxyWrite(STUDENTS_PATH, b64Encode(JSON.stringify(next, null, 2)))
      setStudents(next)
    } catch (e) {
      console.error('Student save failed:', e)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  function add(s: Omit<Student, 'id' | 'since'>) {
    const next = [...students, { ...s, id: Date.now().toString(), since: new Date().toISOString().slice(0, 10) }]
    save(next)
  }

  function update(id: string, patch: Partial<Student>) {
    const next = students.map(s => s.id === id ? { ...s, ...patch } : s)
    save(next)
  }

  function remove(id: string) {
    save(students.filter(s => s.id !== id))
  }

  return { students, loading, saving, saveError, add, update, remove }
}
