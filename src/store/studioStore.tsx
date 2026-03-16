import React, { createContext, useContext, useMemo, useReducer } from 'react'
import type { ClipPath, ClipRect, ElementLayer, ToolId, WorkSnapshot } from '../types'
import { materialById } from '../data/materials'
import { uid } from '../utils/id'
import { loadWorkFromLocalStorage, saveWorkToLocalStorage } from '../utils/storage'

type CutDraft = {
  layerId: string
  start: { x: number; y: number }
  current: { x: number; y: number }
}

type FreeCutDraft = {
  layerId: string
  points: { x: number; y: number }[]
}

export type StudioState = {
  title: string
  tool: ToolId
  layers: ElementLayer[]
  selectedId: string | null
  history: ElementLayer[][]
  historyIndex: number
  cutDraft: CutDraft | null
  freeCutDraft: FreeCutDraft | null
}

type Action =
  | { type: 'setTool'; tool: ToolId }
  | { type: 'addLayerFromMaterial'; materialId: string; at: { x: number; y: number } }
  | { type: 'select'; id: string | null }
  | { type: 'moveSelected'; dx: number; dy: number }
  | { type: 'setLayer'; id: string; patch: Partial<ElementLayer>; record?: boolean }
  | { type: 'duplicateSelected' }
  | { type: 'deleteSelected' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'startCut'; layerId: string; at: { x: number; y: number } }
  | { type: 'updateCut'; at: { x: number; y: number } }
  | { type: 'commitCut' }
  | { type: 'cancelCut' }
  | { type: 'startFreeCut'; layerId: string; at: { x: number; y: number } }
  | { type: 'addFreeCutPoint'; at: { x: number; y: number } }
  | { type: 'commitFreeCut' }
  | { type: 'cancelFreeCut' }
  | { type: 'loadWork'; work: WorkSnapshot }
  | { type: 'setTitle'; title: string }

function cloneLayers(layers: ElementLayer[]) {
  return layers.map((l) => ({
    ...l,
    clipRect: l.clipRect ? { ...l.clipRect } : undefined,
    clipPath: l.clipPath ? ({ ...l.clipPath } satisfies ClipPath) : undefined,
  }))
}

function pushHistory(state: StudioState, nextLayers: ElementLayer[]) {
  const history = state.history.slice(0, state.historyIndex + 1)
  history.push(cloneLayers(nextLayers))
  const capped = history.length > 60 ? history.slice(history.length - 60) : history
  const index = capped.length - 1
  return { history: capped, historyIndex: index }
}

const initialState: StudioState = {
  title: '我的胶州剪纸',
  tool: 'select',
  layers: [],
  selectedId: null,
  history: [[]],
  historyIndex: 0,
  cutDraft: null,
  freeCutDraft: null,
}

function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case 'setTitle':
      return { ...state, title: action.title }
    case 'setTool':
      return { ...state, tool: action.tool, cutDraft: null, freeCutDraft: null }
    case 'addLayerFromMaterial': {
      const m = materialById(action.materialId)
      if (!m) return state
      const layer: ElementLayer = {
        id: uid('layer'),
        materialId: m.id,
        name: m.name,
        type: m.type,
        path: m.path,
        viewBox: m.viewBox,
        color: m.defaultColor,
        x: action.at.x,
        y: action.at.y,
        rotation: 0,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        folded: false,
      }
      const layers = [...state.layers, layer]
      const h = pushHistory(state, layers)
      return { ...state, layers, selectedId: layer.id, ...h }
    }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'moveSelected': {
      if (!state.selectedId) return state
      const layers = state.layers.map((l) =>
        l.id === state.selectedId ? { ...l, x: l.x + action.dx, y: l.y + action.dy } : l,
      )
      return { ...state, layers }
    }
    case 'setLayer': {
      const layers = state.layers.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l))
      if (action.record === false) return { ...state, layers }
      const h = pushHistory(state, layers)
      return { ...state, layers, ...h }
    }
    case 'duplicateSelected': {
      const id = state.selectedId
      if (!id) return state
      const src = state.layers.find((l) => l.id === id)
      if (!src) return state
      const copy: ElementLayer = { ...src, id: uid('layer'), x: src.x + 24, y: src.y + 24 }
      const layers = [...state.layers, copy]
      const h = pushHistory(state, layers)
      return { ...state, layers, selectedId: copy.id, ...h }
    }
    case 'deleteSelected': {
      const id = state.selectedId
      if (!id) return state
      const layers = state.layers.filter((l) => l.id !== id)
      const h = pushHistory(state, layers)
      return { ...state, layers, selectedId: null, ...h }
    }
    case 'undo': {
      if (state.historyIndex <= 0) return state
      const idx = state.historyIndex - 1
      return {
        ...state,
        layers: cloneLayers(state.history[idx]),
        historyIndex: idx,
        selectedId: null,
        cutDraft: null,
        freeCutDraft: null,
      }
    }
    case 'redo': {
      if (state.historyIndex >= state.history.length - 1) return state
      const idx = state.historyIndex + 1
      return {
        ...state,
        layers: cloneLayers(state.history[idx]),
        historyIndex: idx,
        selectedId: null,
        cutDraft: null,
        freeCutDraft: null,
      }
    }
    case 'startCut':
      return { ...state, cutDraft: { layerId: action.layerId, start: action.at, current: action.at } }
    case 'updateCut':
      if (!state.cutDraft) return state
      return { ...state, cutDraft: { ...state.cutDraft, current: action.at } }
    case 'commitCut': {
      const d = state.cutDraft
      if (!d) return state
      const rect: ClipRect = {
        x: Math.min(d.start.x, d.current.x),
        y: Math.min(d.start.y, d.current.y),
        w: Math.abs(d.current.x - d.start.x),
        h: Math.abs(d.current.y - d.start.y),
      }
      const layers = state.layers.map((l) => (l.id === d.layerId ? { ...l, clipRect: rect } : l))
      const h = pushHistory(state, layers)
      return { ...state, layers, cutDraft: null, selectedId: d.layerId, ...h }
    }
    case 'cancelCut':
      return { ...state, cutDraft: null }
    case 'startFreeCut':
      return { ...state, freeCutDraft: { layerId: action.layerId, points: [action.at] } }
    case 'addFreeCutPoint':
      if (!state.freeCutDraft) return state
      return { ...state, freeCutDraft: { ...state.freeCutDraft, points: [...state.freeCutDraft.points, action.at] } }
    case 'commitFreeCut': {
      const d = state.freeCutDraft
      if (!d) return state
      if (d.points.length < 3) return { ...state, freeCutDraft: null }
      const dStr =
        `M ${d.points[0].x} ${d.points[0].y} ` +
        d.points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ' Z'
      const layers = state.layers.map((l) => (l.id === d.layerId ? { ...l, clipPath: { d: dStr } } : l))
      const h = pushHistory(state, layers)
      return { ...state, layers, freeCutDraft: null, selectedId: d.layerId, ...h }
    }
    case 'cancelFreeCut':
      return { ...state, freeCutDraft: null }
    case 'loadWork': {
      const layers = cloneLayers(action.work.layers)
      return {
        ...state,
        title: action.work.title || state.title,
        tool: 'select',
        layers,
        selectedId: null,
        cutDraft: null,
        freeCutDraft: null,
        history: [cloneLayers(layers)],
        historyIndex: 0,
      }
    }
    default:
      return state
  }
}

type StudioApi = {
  state: StudioState
  dispatch: React.Dispatch<Action>
  canUndo: boolean
  canRedo: boolean
  selected: ElementLayer | null
  saveNow: () => void
  loadSaved: () => boolean
}

const Ctx = createContext<StudioApi | null>(null)

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const api: StudioApi = useMemo(() => {
    const selected = state.selectedId ? state.layers.find((l) => l.id === state.selectedId) ?? null : null
    const canUndo = state.historyIndex > 0
    const canRedo = state.historyIndex < state.history.length - 1
    const saveNow = () => {
      const now = Date.now()
      const work: WorkSnapshot = {
        version: 1,
        createdAt: now,
        updatedAt: now,
        title: state.title,
        layers: state.layers,
      }
      saveWorkToLocalStorage(work)
    }
    const loadSaved = () => {
      const work = loadWorkFromLocalStorage()
      if (!work) return false
      dispatch({ type: 'loadWork', work })
      return true
    }
    return { state, dispatch, canUndo, canRedo, selected, saveNow, loadSaved }
  }, [state])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStudio() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStudio must be used inside StudioProvider')
  return v
}

