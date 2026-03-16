import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useStudio } from '../store/studioStore'

const PAPER_W = 2200
const PAPER_H = 1400

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function ptFromEvent(
  e: React.PointerEvent,
  svgEl: SVGSVGElement,
): { x: number; y: number } {
  const pt = svgEl.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const m = svgEl.getScreenCTM()
  if (!m) return { x: 0, y: 0 }
  const r = pt.matrixTransform(m.inverse())
  return { x: r.x, y: r.y }
}

export function PaperCanvas() {
  const { state, dispatch, selected } = useStudio()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [view, setView] = useState({ x: 0, y: 0, w: 900, h: 620 })
  const [drag, setDrag] = useState<{
    id: string
    last: { x: number; y: number }
    moved: boolean
  } | null>(null)
  const [pan, setPan] = useState<{ last: { x: number; y: number } } | null>(null)

  const selectedTransform = useMemo(() => {
    if (!selected) return null
    return `translate(${selected.x} ${selected.y}) rotate(${selected.rotation}) scale(${selected.scaleX * selected.scale} ${selected.scaleY * selected.scale})`
  }, [selected])

  useEffect(() => {
    // fold/flip animation: whenever selected changes, we just ensure its group exists; animations are triggered in Toolbar for explicit actions.
  }, [selectedTransform])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">主画布</div>
          <div className="text-base font-semibold text-slate-900">SVG 剪纸创作区</div>
        </div>
        <div className="text-xs text-slate-500">
          工具：<span className="font-medium text-slate-700">{toolName(state.tool)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="block w-full h-[520px] md:h-[620px] touch-none select-none"
          onWheel={(e) => {
            if (!svgRef.current) return
            e.preventDefault()
            const p = ptFromEvent(e as unknown as React.PointerEvent, svgRef.current)
            const zoom = e.deltaY > 0 ? 1.08 : 0.92
            const nextW = clamp(view.w * zoom, 500, PAPER_W)
            const nextH = clamp(view.h * zoom, 350, PAPER_H)
            const kx = (p.x - view.x) / view.w
            const ky = (p.y - view.y) / view.h
            const nx = clamp(p.x - kx * nextW, 0, PAPER_W - nextW)
            const ny = clamp(p.y - ky * nextH, 0, PAPER_H - nextH)
            setView({ x: nx, y: ny, w: nextW, h: nextH })
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData('application/x-jz-material')
            if (!id || !svgRef.current) return
            const rect = svgRef.current.getBoundingClientRect()
            const x = view.x + ((e.clientX - rect.left) / rect.width) * view.w
            const y = view.y + ((e.clientY - rect.top) / rect.height) * view.h
            dispatch({
              type: 'addLayerFromMaterial',
              materialId: id,
              at: { x: clamp(x, 40, PAPER_W - 40), y: clamp(y, 40, PAPER_H - 40) },
            })
          }}
          onPointerDown={(e) => {
            if (!svgRef.current) return
            const p = ptFromEvent(e, svgRef.current)
            // space / middle button pan
            if (e.button === 1 || e.shiftKey) {
              setPan({ last: p })
              return
            }
            // click empty -> deselect unless cutting
            if (state.tool === 'cut' && state.selectedId) {
              dispatch({ type: 'startCut', layerId: state.selectedId, at: p })
              return
            }
            if (state.tool === 'cutFree' && state.selectedId) {
              dispatch({ type: 'startFreeCut', layerId: state.selectedId, at: p })
              return
            }
            dispatch({ type: 'select', id: null })
          }}
          onPointerMove={(e) => {
            if (!svgRef.current) return
            const p = ptFromEvent(e, svgRef.current)
            if (state.cutDraft) {
              dispatch({ type: 'updateCut', at: p })
            } else if (state.freeCutDraft) {
              dispatch({ type: 'addFreeCutPoint', at: p })
            } else if (pan) {
              const dx = pan.last.x - p.x
              const dy = pan.last.y - p.y
              setView((v) => ({
                ...v,
                x: clamp(v.x + dx, 0, PAPER_W - v.w),
                y: clamp(v.y + dy, 0, PAPER_H - v.h),
              }))
              setPan({ last: p })
            } else if (drag) {
              const dx = p.x - drag.last.x
              const dy = p.y - drag.last.y
              dispatch({ type: 'moveSelected', dx, dy })
              setDrag({ ...drag, last: p, moved: true })
            }
          }}
          onPointerUp={() => {
            if (state.cutDraft) {
              dispatch({ type: 'commitCut' })
            }
            if (state.freeCutDraft) {
              dispatch({ type: 'commitFreeCut' })
            }
            setDrag(null)
            setPan(null)
          }}
        >
          <defs>
            {state.layers.map((l) => {
              if (!l.clipRect) return null
              return (
                <clipPath key={`${l.id}_clip`} id={`${l.id}_clip`}>
                  <rect
                    x={l.clipRect.x}
                    y={l.clipRect.y}
                    width={l.clipRect.w}
                    height={l.clipRect.h}
                    rx={6}
                    ry={6}
                  />
                </clipPath>
              )
            })}
            {state.layers.map((l) => {
              if (!l.clipPath?.d) return null
              return (
                <clipPath key={`${l.id}_clippath`} id={`${l.id}_clippath`}>
                  <path d={l.clipPath.d} />
                </clipPath>
              )
            })}
          </defs>

          {/* background grid */}
          <g opacity={0.18}>
            {Array.from({ length: Math.floor(PAPER_W / 40) + 1 }).map((_, i) => (
              <line key={`vx${i}`} x1={i * 40} y1={0} x2={i * 40} y2={PAPER_H} stroke="#94a3b8" strokeWidth={1} />
            ))}
            {Array.from({ length: Math.floor(PAPER_H / 40) + 1 }).map((_, i) => (
              <line key={`hy${i}`} x1={0} y1={i * 40} x2={PAPER_W} y2={i * 40} stroke="#94a3b8" strokeWidth={1} />
            ))}
          </g>

          {/* big paper boundary */}
          <rect x={0} y={0} width={PAPER_W} height={PAPER_H} fill="none" stroke="#e2e8f0" strokeWidth={6} opacity={0.5} />

          {/* layers */}
          {state.layers.map((l) => {
            const transform = `translate(${l.x} ${l.y}) rotate(${l.rotation}) scale(${l.scaleX * l.scale} ${l.scaleY * l.scale})`
            const isSelected = l.id === state.selectedId
            const clipPath = l.clipPath?.d
              ? `url(#${l.id}_clippath)`
              : l.clipRect
                ? `url(#${l.id}_clip)`
                : undefined
            return (
              <g
                key={l.id}
                data-layer-id={l.id}
                transform={transform}
                clipPath={clipPath}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (!svgRef.current) return
                  dispatch({ type: 'select', id: l.id })

                  if (state.tool === 'cut') {
                    const p = ptFromEvent(e, svgRef.current)
                    dispatch({ type: 'startCut', layerId: l.id, at: p })
                    return
                  }
                  if (state.tool === 'cutFree') {
                    const p = ptFromEvent(e, svgRef.current)
                    dispatch({ type: 'startFreeCut', layerId: l.id, at: p })
                    return
                  }
                  const p = ptFromEvent(e, svgRef.current)
                  setDrag({ id: l.id, last: p, moved: false })
                }}
              >
                <path
                  d={l.path}
                  fill={l.color}
                  opacity={0.92}
                  stroke="#7f1d1d"
                  strokeOpacity={0.35}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    transformOrigin: 'center',
                    transform: l.folded ? 'scaleX(0.06) skewY(10deg)' : undefined,
                    filter: isSelected ? 'drop-shadow(0 8px 16px rgba(15, 23, 42, 0.18))' : undefined,
                    transition: 'transform 220ms ease',
                  }}
                />

                {/* selection box */}
                {isSelected && (
                  <rect
                    x={-70}
                    y={-70}
                    width={140}
                    height={140}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            )
          })}

          {/* cutting draft rectangle */}
          {state.cutDraft && (
            <g>
              <rect
                x={Math.min(state.cutDraft.start.x, state.cutDraft.current.x)}
                y={Math.min(state.cutDraft.start.y, state.cutDraft.current.y)}
                width={Math.abs(state.cutDraft.current.x - state.cutDraft.start.x)}
                height={Math.abs(state.cutDraft.current.y - state.cutDraft.start.y)}
                fill="rgba(59,130,246,0.10)"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="6 6"
              />
            </g>
          )}

          {/* free cut draft path */}
          {state.freeCutDraft && state.freeCutDraft.points.length > 1 && (
            <g>
              <path
                d={
                  `M ${state.freeCutDraft.points[0].x} ${state.freeCutDraft.points[0].y} ` +
                  state.freeCutDraft.points
                    .slice(1)
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(' ')
                }
                fill="rgba(59,130,246,0.08)"
                stroke="#2563eb"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={state.freeCutDraft.points[0].x}
                cy={state.freeCutDraft.points[0].y}
                r={5}
                fill="#2563eb"
                opacity={0.8}
              />
            </g>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">拖拽素材 → 添加图层</span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">点击图层 → 选中</span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">拖动图层 → 移动</span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">剪切：矩形 or 随手剪</span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">Shift/中键拖动：平移视图；滚轮：缩放</span>
      </div>
    </div>
  )
}

function toolName(t: string) {
  switch (t) {
    case 'select':
      return '选择/移动'
    case 'fold':
      return '折叠/展开'
    case 'cut':
      return '剪切（矩形裁剪）'
    case 'cutFree':
      return '随手剪（自由形状）'
    case 'flipH':
      return '水平翻转'
    case 'flipV':
      return '垂直翻转'
    case 'duplicate':
      return '复制'
    case 'delete':
      return '删除'
    default:
      return t
  }
}

// optional: keep gsap in bundle for future element-specific animation hooks
void gsap

