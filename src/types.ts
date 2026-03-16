export type ToolId =
  | 'select'
  | 'fold'
  | 'cut'
  | 'cutFree'
  | 'flipH'
  | 'flipV'
  | 'duplicate'
  | 'delete'

export type Material = {
  id: string
  name: string
  type: 'fish' | 'flower' | 'dragon' | 'pattern' | 'window'
  viewBox: string
  path: string
  defaultColor: string
  meaning: string
}

export type ClipRect = { x: number; y: number; w: number; h: number }
export type ClipPath = { d: string }

export type ElementLayer = {
  id: string
  materialId: string
  name: string
  type: Material['type']
  path: string
  viewBox: string
  color: string
  x: number
  y: number
  rotation: number
  scale: number
  scaleX: number
  scaleY: number
  folded: boolean
  clipRect?: ClipRect
  clipPath?: ClipPath
}

export type WorkSnapshot = {
  version: 1
  createdAt: number
  updatedAt: number
  title: string
  layers: ElementLayer[]
}

