export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <div className="panel shadow-soft w-full max-w-4xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700">
              非遗体验 · 胶州剪纸
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              胶州剪纸创作模拟器
            </h1>
            <p className="mt-3 text-slate-600 leading-relaxed">
              在网页上体验传统剪纸的<strong>折叠、剪切、翻转</strong>等过程，创作属于你的窗花与吉祥纹样。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={onStart}>
                开始创作
              </button>
              <div className="relative inline-block">
                <select
                  className="btn-ghost appearance-none pr-8 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) {
                      window.open(e.target.value, '_blank', 'noreferrer')
                      e.target.value = ''
                    }
                  }}
                  defaultValue=""
                  title="选择搜索平台了解剪纸文化"
                >
                  <option value="" disabled>了解剪纸 ▼</option>
                  <option value="https://www.baidu.com/s?wd=胶州剪纸">百度搜索 - 胶州剪纸</option>
                  <option value="https://www.baidu.com/s?wd=中国剪纸艺术">百度搜索 - 中国剪纸艺术</option>
                  <option value="https://www.baidu.com/s?wd=非遗剪纸">百度搜索 - 非遗剪纸</option>
                  <option value="https://www.baidu.com/s?wd=剪纸教程">百度搜索 - 剪纸教程</option>
                  <option value="https://www.bing.com/search?q=胶州剪纸">必应搜索 - 胶州剪纸</option>
                  <option value="https://www.google.com/search?q=胶州剪纸">谷歌搜索 - 胶州剪纸</option>
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▼</div>
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              小贴士：在创作页你可以把右侧素材<strong>拖到画布</strong>；支持撤销/重做与导出 PNG。
            </div>
          </div>

          <div className="relative p-8 bg-gradient-to-br from-red-50 to-amber-50 border-t md:border-t-0 md:border-l border-slate-200">
            <div className="text-sm text-slate-600">
              传统剪纸常用红纸象征喜庆。这里我们用 SVG 图层模拟“纸片”，并用动画表现折叠与翻转的手感。
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <FeatureCard title="折叠/展开" desc="一键折叠效果，适合做对称变化" />
              <FeatureCard title="剪切工具" desc="拖拽画框裁剪图案（矩形）" />
              <FeatureCard title="翻转" desc="水平/垂直翻转图层" />
              <FeatureCard title="保存/分享" desc="保存到本地、导出 PNG、Web Share" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
      <div className="font-medium text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </div>
  )
}

