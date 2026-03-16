import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStudio } from '../store/studioStore'

function svgToDataUrl(svgText: string) {
  const encoded = encodeURIComponent(svgText)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

export function PaperPreview3D() {
  const { state } = useStudio()
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const stampRef = useRef(0)

  const svgMarkup = useMemo(() => {
    // Build a minimal SVG snapshot of current layers (same coordinate space as PaperCanvas paper)
    const PAPER_W = 2200
    const PAPER_H = 1400
    const defs: string[] = []
    const layerSvgs: string[] = []

    for (const l of state.layers) {
      if (l.clipRect) {
        defs.push(
          `<clipPath id="${l.id}_clip"><rect x="${l.clipRect.x}" y="${l.clipRect.y}" width="${l.clipRect.w}" height="${l.clipRect.h}" rx="6" ry="6" /></clipPath>`,
        )
      }
      if (l.clipPath?.d) {
        defs.push(`<clipPath id="${l.id}_clippath"><path d="${l.clipPath.d}" /></clipPath>`)
      }
      const clip = l.clipPath?.d
        ? `clip-path="url(#${l.id}_clippath)"`
        : l.clipRect
          ? `clip-path="url(#${l.id}_clip)"`
          : ''
      const transform = `translate(${l.x} ${l.y}) rotate(${l.rotation}) scale(${l.scaleX * l.scale} ${l.scaleY * l.scale})`
      layerSvgs.push(
        `<g transform="${transform}" ${clip}><path d="${l.path}" fill="${l.color}" fill-opacity="0.92" stroke="#7f1d1d" stroke-opacity="0.25" stroke-width="2"/></g>`,
      )
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PAPER_W}" height="${PAPER_H}" viewBox="0 0 ${PAPER_W} ${PAPER_H}">
  <defs>${defs.join('')}</defs>
  <rect x="0" y="0" width="${PAPER_W}" height="${PAPER_H}" fill="#ffffff"/>
  ${layerSvgs.join('')}
</svg>`
  }, [state.layers])

  useEffect(() => {
    // update texture when layers change
    stampRef.current += 1
    const loader = new THREE.TextureLoader()
    const url = svgToDataUrl(svgMarkup)
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.needsUpdate = true
        setTex(t)
      },
      undefined,
      () => setTex(null),
    )
  }, [svgMarkup])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">3D 预览</div>
          <div className="text-base font-semibold text-slate-900">360° 查看纸面效果</div>
        </div>
        <div className="text-xs text-slate-500">拖拽旋转 / 滚轮缩放</div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden h-[280px]">
        <Canvas
          camera={{ position: [0, 1.2, 2.2], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#ffffff']} />
          <ambientLight intensity={0.65} />
          <directionalLight position={[2, 3, 2]} intensity={0.9} />
          <group rotation={[0.15, 0.2, 0]}>
            <mesh>
              <planeGeometry args={[1.6, 1.0, 60, 40]} />
              <meshStandardMaterial
                color="#ffffff"
                metalness={0.02}
                roughness={0.65}
                map={tex ?? undefined}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
          <OrbitControls enablePan={false} minDistance={1.2} maxDistance={4.5} />
        </Canvas>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">实时贴图：你的作品 → 纸面纹样</span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">可 360° 旋转查看折叠/翻转效果</span>
      </div>
    </div>
  )
}

