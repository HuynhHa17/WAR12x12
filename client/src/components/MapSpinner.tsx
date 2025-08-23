import { motion } from 'framer-motion'
import type { Terrain } from '../types'

const LABELS: Record<Terrain, string> = {
  desert: 'Sa mạc',
  jungle: 'Rừng rậm',
  prairie: 'Thảo nguyên',
  ice: 'Băng giá',
}

const ORDER: Terrain[] = ['desert', 'jungle', 'prairie', 'ice']
const CENTER_DEG = [45, 135, 225, 315] // tâm mỗi lát (90°/lát)

export default function MapSpinner({
  target,
  onDone,
  
}: {
  target: Terrain
  onDone?: () => void
}) {
  const idx = ORDER.indexOf(target)
  const center = CENTER_DEG[idx >= 0 ? idx : 0]
  const finalRotate = 3 * 360 - center   // quay 3 vòng rồi dừng đúng lát
  const duration = 1.5

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-[320px] h-[360px]">
        {/* Kim cố định */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderBottom: '18px solid #eab308',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))',
            }}
          />
        </div>

        {/* Bánh xe */}
        <motion.div
          className="absolute inset-x-0 top-10 mx-auto w-72 h-72 rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden"
          initial={{ rotate: 0 }}
          animate={{ rotate: finalRotate }}
          transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={onDone}
          style={{
            background:
              'conic-gradient(' +
              '#16a34a 0 90deg,' +      // emerald
              '#0ea5e9 90deg 180deg,' + // sky
              '#eab308 180deg 270deg,' +// amber
              '#f43f5e 270deg 360deg' + // rose
              ')',
          }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute w-[2px] h-full bg-white/20 left-1/2 top-1/2 origin-top"
              style={{ transform: `rotate(${deg}deg) translateY(-50%)` }}
            />
          ))}

          <WheelLabel text={LABELS.desert} deg={45} />
          <WheelLabel text={LABELS.jungle} deg={135} />
          <WheelLabel text={LABELS.prairie} deg={225} />
          <WheelLabel text={LABELS.ice} deg={315} />
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 pb-2 text-center">
          <div className="text-sm opacity-80">Đang random địa hình…</div>
          <div className="mt-1 text-lg font-semibold">{LABELS[target]}</div>
        </div>
      </div>
    </div>
  )
}

function WheelLabel({ text, deg }: { text: string; deg: number }) {
  const r = 96
  const x = 144 + r * Math.cos((deg * Math.PI) / 180)
  const y = 144 + r * Math.sin((deg * Math.PI) / 180)
  return (
    <div
      className="absolute text-[13px] font-semibold text-white drop-shadow"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
    >
      {text}
    </div>
  )
}
