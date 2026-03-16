import type { WorkSnapshot } from '../types'

const KEY = 'jiaozhou_papercut_work_v1'

export function saveWorkToLocalStorage(work: WorkSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(work))
}

export function loadWorkFromLocalStorage(): WorkSnapshot | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WorkSnapshot
  } catch {
    return null
  }
}

