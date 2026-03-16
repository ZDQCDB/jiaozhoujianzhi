import { MATERIALS } from '../data/materials'

export function MaterialLibrary() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">素材库</div>
          <div className="text-base font-semibold text-slate-900">胶州元素</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {MATERIALS.map((m) => (
          <div
            key={m.id}
            className="group rounded-xl border border-slate-200 bg-white/70 p-3 cursor-grab active:cursor-grabbing hover:border-red-200 hover:bg-red-50/30 transition"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-jz-material', m.id)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            title={m.meaning}
          >
            <div className="aspect-square rounded-lg bg-white flex items-center justify-center border border-slate-200">
              <svg viewBox={m.viewBox} className="h-16 w-16">
                <path d={m.path} fill={m.defaultColor} opacity={0.9} />
              </svg>
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900 leading-tight">
              {m.name}
            </div>
            <div className="mt-1 text-xs text-slate-600">{m.meaning}</div>
            <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-700">
              拖拽到画布添加
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

