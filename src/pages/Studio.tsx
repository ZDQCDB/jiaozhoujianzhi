import { MaterialLibrary } from '../ui/MaterialLibrary'
import { Toolbar } from '../ui/Toolbar'
import { PaperCanvas } from '../ui/PaperCanvas'
import { PaperPreview3D } from '../ui/PaperPreview3D'

export function Studio({ onBackHome }: { onBackHome: () => void }) {
  return (
    <div className="h-full w-full p-4 md:p-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">胶州剪纸创作模拟器</div>
            <div className="text-xl font-semibold text-slate-900">创作台</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={onBackHome}>
              返回介绍页
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4 items-start">
          <div className="panel shadow-soft overflow-hidden">
            <MaterialLibrary />
          </div>
          <div className="flex flex-col gap-4">
            <div className="panel shadow-soft overflow-hidden">
              <PaperCanvas />
            </div>
            <div className="panel shadow-soft overflow-hidden">
              <PaperPreview3D />
            </div>
          </div>
          <div className="panel shadow-soft overflow-hidden">
            <Toolbar />
          </div>
        </div>
      </div>
    </div>
  )
}

