import html2canvas from 'html2canvas'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStudio } from '../store/studioStore'
import type { ToolId } from '../types'

const TOOL_BUTTONS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'select', label: '选择', hint: '选中并拖动移动' },
  { id: 'fold', label: '折叠', hint: '折叠/展开选中图层' },
  { id: 'cut', label: '剪切', hint: '拖拽画框裁剪（矩形）' },
  { id: 'cutFree', label: '随手剪', hint: '按住拖动绘制任意闭合形状裁剪' },
  { id: 'flipH', label: '水平翻转', hint: '镜像翻转' },
  { id: 'flipV', label: '垂直翻转', hint: '上下翻转' },
  { id: 'duplicate', label: '复制', hint: '复制选中图层' },
  { id: 'delete', label: '删除', hint: '删除选中图层' },
]

export function Toolbar() {
  const { state, dispatch, selected, canUndo, canRedo, saveNow, loadSaved } = useStudio()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const exportStampRef = useRef<string>('work')

  const selectedMeta = useMemo(() => {
    if (!selected) return null
    return `${selected.name}（${Math.round(selected.x)}, ${Math.round(selected.y)}）`
  }, [selected])

  useEffect(() => {
    // avoid calling Date.now() in render path (eslint react purity rule)
    exportStampRef.current = String(Date.now())
  }, [])

  const notify = (msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1600)
  }

  const runTool = async (tool: ToolId) => {
    dispatch({ type: 'setTool', tool })
    if (!selected && tool !== 'select') {
      notify('请先选中一个图层')
      return
    }
    if (!selected) return

    switch (tool) {
      case 'fold': {
        const next = !selected.folded
        // animate selected group with gsap for a more tactile fold feel
        const el = document.querySelector(`[data-layer-id="${selected.id}"]`) as SVGGElement | null
        if (el) {
          gsap.fromTo(
            el,
            { transformOrigin: 'center center', scaleX: 1, skewY: 0 },
            { duration: 0.28, scaleX: next ? 0.06 : 1, skewY: next ? 10 : 0, ease: 'power2.out' },
          )
        }
        dispatch({ type: 'setLayer', id: selected.id, patch: { folded: next } })
        return
      }
      case 'flipH': {
        const el = document.querySelector(`[data-layer-id="${selected.id}"]`) as SVGGElement | null
        if (el) gsap.to(el, { duration: 0.22, scaleX: `-=${0}`, ease: 'power2.out' })
        dispatch({
          type: 'setLayer',
          id: selected.id,
          patch: { scaleX: selected.scaleX * -1 },
        })
        return
      }
      case 'flipV': {
        const el = document.querySelector(`[data-layer-id="${selected.id}"]`) as SVGGElement | null
        if (el) gsap.to(el, { duration: 0.22, scaleY: `-=${0}`, ease: 'power2.out' })
        dispatch({
          type: 'setLayer',
          id: selected.id,
          patch: { scaleY: selected.scaleY * -1 },
        })
        return
      }
      case 'duplicate':
        dispatch({ type: 'duplicateSelected' })
        notify('已复制图层')
        return
      case 'delete':
        dispatch({ type: 'deleteSelected' })
        notify('已删除图层')
        return
      default:
        return
    }
  }

  const exportPng = async () => {
    const target = document.querySelector('svg') as SVGSVGElement | null
    if (!target) return
    const canvas = await html2canvas(target as unknown as HTMLElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `jiaozhou-papercut-${exportStampRef.current}.png`
    a.click()
    notify('已导出 PNG')
  }

  const share = async () => {
    const text = '我在「胶州剪纸创作模拟器」做了一幅作品，来看看！'
    try {
      if (navigator.share) {
        await navigator.share({ title: state.title, text })
        notify('已唤起系统分享')
      } else {
        await navigator.clipboard.writeText(text)
        notify('已复制分享文案')
      }
    } catch {
      notify('分享取消或失败')
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">工具栏</div>
          <div className="text-base font-semibold text-slate-900">操作与文件</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-slate-500">当前工具</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {TOOL_BUTTONS.map((b) => {
            const active = state.tool === b.id
            return (
              <button
                key={b.id}
                className={active ? 'btn-primary' : 'btn-ghost'}
                onClick={() => void runTool(b.id)}
                title={b.hint}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button className="btn-ghost" disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
          撤销
        </button>
        <button className="btn-ghost" disabled={!canRedo} onClick={() => dispatch({ type: 'redo' })}>
          重做
        </button>
      </div>

      <div className="mt-6">
        <div className="text-xs text-slate-500">选中图层</div>
        <div className="mt-1 rounded-xl border border-slate-200 bg-white/70 p-3">
          <div className="text-sm font-medium text-slate-900">{selected ? selected.name : '未选中'}</div>
          <div className="mt-1 text-xs text-slate-600">{selectedMeta ?? '点击画布中的图案以选中'}</div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">颜色</span>
            <input
              type="color"
              className="h-8 w-10 rounded border border-slate-200 bg-white"
              disabled={!selected}
              value={selected?.color ?? '#dc2626'}
              onChange={(e) => {
                if (!selected) return
                dispatch({ type: 'setLayer', id: selected.id, patch: { color: e.target.value } })
              }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="btn-ghost"
              disabled={!selected}
              onClick={() => {
                if (!selected) return
                dispatch({ type: 'setLayer', id: selected.id, patch: { scale: selected.scale * 1.08 } })
              }}
            >
              放大
            </button>
            <button
              className="btn-ghost"
              disabled={!selected}
              onClick={() => {
                if (!selected) return
                dispatch({ type: 'setLayer', id: selected.id, patch: { scale: Math.max(0.2, selected.scale * 0.92) } })
              }}
            >
              缩小
            </button>
            <button
              className="btn-ghost"
              disabled={!selected}
              onClick={() => {
                if (!selected) return
                dispatch({ type: 'setLayer', id: selected.id, patch: { rotation: selected.rotation - 15 } })
              }}
            >
              左旋
            </button>
            <button
              className="btn-ghost"
              disabled={!selected}
              onClick={() => {
                if (!selected) return
                dispatch({ type: 'setLayer', id: selected.id, patch: { rotation: selected.rotation + 15 } })
              }}
            >
              右旋
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs text-slate-500">保存与导出</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className="btn-ghost"
            onClick={() => {
              saveNow()
              notify('已保存到本地')
            }}
          >
            保存
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              const ok = loadSaved()
              notify(ok ? '已加载本地作品' : '没有找到已保存作品')
            }}
          >
            加载
          </button>
          <button className="btn-primary col-span-2" onClick={() => void exportPng()}>
            导出 PNG
          </button>
          <button className="btn-ghost col-span-2" onClick={() => void share()}>
            分享
          </button>
        </div>
      </div>

      {toast && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
          {toast}
        </div>
      )}
    </div>
  )
}

