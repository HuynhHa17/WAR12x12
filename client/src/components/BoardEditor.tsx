import { useEffect, useMemo, useState } from 'react'
import type { Board, Dir, Terrain } from '../types'
import toast from 'react-hot-toast'

type UnitType = 'commander' | 'artillery' | 'armor' | 'missile' | 'radar'
type Point = { x: number; y: number }
type Placement = { id: string; type: UnitType; x: number; y: number; dir: Dir }

const letters = 'ABCDEFGHIJKL'.split('')
const DIRS: Dir[] = ['N', 'E', 'S', 'W']

const UNIT_LABEL: Record<UnitType, string> = {
  commander: 'Chỉ huy (1x1)',
  artillery: 'Pháo (1x2)',
  armor:     'Thiết giáp (2x2)',
  missile:   'Tên lửa (1x4)',
  radar:     'Ra-đa (2x2)',
}
const UNIT_COUNT: Record<UnitType, number> = {
  commander: 1, artillery: 1, armor: 1, missile: 1, radar: 1,
}
const mapName: Record<Terrain, string> = {
  desert: 'Sa mạc', jungle: 'Rừng rậm', prairie: 'Thảo nguyên', ice: 'Băng giá',
}

/* ---------- geometry helpers ---------- */
function cellsFor(type: UnitType, x: number, y: number, dir: Dir): Point[] {
  const out: Point[] = []
  const rot = (dx: number, dy: number): [number, number] => {
    switch (dir) {
      case 'N': return [dx, dy]
      case 'E': return [dy, -dx]
      case 'S': return [-dx, -dy]
      case 'W': return [-dy, dx]
    }
  }
  const stamp = (w: number, h: number) => {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const [rx, ry] = rot(xx, yy)
        out.push({ x: x + rx, y: y + ry })
      }
  }
  if (type === 'commander') stamp(1,1)
  else if (type === 'artillery') stamp(1,2)
  else if (type === 'armor') stamp(2,2)
  else if (type === 'missile') stamp(1,4)
  else if (type === 'radar') stamp(2,2)
  return out
}
const inBounds = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < 12 && p.y < 12

function collides(board: Board, placed: Placement[], type: UnitType, x: number, y: number, dir: Dir) {
  const occ = new Set<string>()
  placed.forEach(pl => cellsFor(pl.type, pl.x, pl.y, pl.dir).forEach(c => occ.add(`${c.x},${c.y}`)))
  const cells = cellsFor(type, x, y, dir)
  for (const c of cells) {
    if (!inBounds(c)) return 'Ra ngoài bản đồ'
    if (board[c.y][c.x].o) return 'Dính vật cản'
    if (occ.has(`${c.x},${c.y}`)) return 'Đè lên đơn vị khác'
  }
  return null
}

function findRandomSpot(board: Board, placed: Placement[], type: UnitType, dir: Dir, tries = 200): Point | null {
  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * 12)
    const y = Math.floor(Math.random() * 12)
    if (!collides(board, placed, type, x, y, dir)) return { x, y }
  }
  return null
}

/* ========== component ========== */
export default function BoardEditor({
  board, mapType, onSubmit, endsAt,
}: { board: Board; mapType: Terrain; onSubmit: (units: Placement[]) => void; endsAt?: number }) {
  const [selected, setSelected] = useState<UnitType>('commander')
  const [dir, setDir] = useState<Dir>('N')
  const [hover, setHover] = useState<Point | undefined>()
  const [placed, setPlaced] = useState<Placement[]>([])
  const [deadline] = useState<number>(() => endsAt ?? (Date.now() + 120_000))

  const counter = useMemo(() => {
    const c: Record<UnitType, number> = { commander:0, artillery:0, armor:0, missile:0, radar:0 }
    placed.forEach(p => (c[p.type] += 1))
    return c
  }, [placed])

  const preview = useMemo(() => {
    if (!hover) return new Set<string>()
    return new Set(cellsFor(selected, hover.x, hover.y, dir).map(p => `${p.x},${p.y}`))
  }, [hover, selected, dir])

  /* deadline */
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(t)
        toast('Hết 120s — tự động xác nhận bố trí')
        onSubmit(placed)
      }
    }, 200)
    return () => clearInterval(t)
  }, [deadline, placed, onSubmit])

  /* Q/E/R rotate (ignore when typing) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'q' || e.key === 'Q')
        setDir(d => (d === 'N' ? 'W' : d === 'W' ? 'S' : d === 'S' ? 'E' : 'N'))
      if (e.key === 'e' || e.key === 'E' || e.key === 'r' || e.key === 'R')
        setDir(d => (d === 'N' ? 'E' : d === 'E' ? 'S' : d === 'S' ? 'W' : 'N'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleCellClick = (x: number, y: number) => {
    const err = collides(board, placed, selected, x, y, dir)
    if (!err) {
      setPlaced(p => [...p, { id: crypto.randomUUID(), type: selected, x, y, dir }])
      return
    }
    // click vào ô có quân -> gỡ cả đơn vị
    const hitId = placed.find(pl => cellsFor(pl.type, pl.x, pl.y, pl.dir).some(c => c.x === x && c.y === y))?.id
    if (hitId) setPlaced(p => p.filter(pl => pl.id !== hitId))
    else toast.error(err)
  }

  const randomFill = () => {
    const next: Placement[] = []
    const quotas: UnitType[] = []
    ;(Object.keys(UNIT_COUNT) as UnitType[]).forEach(t => { for (let i=0;i<UNIT_COUNT[t];i++) quotas.push(t) })
    quotas.sort(() => Math.random() - 0.5)
    for (const t of quotas) {
      const tryDirs = [...DIRS].sort(() => Math.random() - 0.5)
      let done = false
      for (const d of tryDirs) {
        const spot = findRandomSpot(board, next, t, d)
        if (spot) { next.push({ id: crypto.randomUUID(), type: t, x: spot.x, y: spot.y, dir: d }); done = true; break }
      }
      if (!done) { toast.error(`Không thể xếp ${UNIT_LABEL[t]} — bản đồ quá chật?`); return }
    }
    setPlaced(next)
  }

  const clearAll = () => setPlaced([])
  const rotateLeft  = () => setDir(d => (d === 'N' ? 'W' : d === 'W' ? 'S' : d === 'S' ? 'E' : 'N'))
  const rotateRight = () => setDir(d => (d === 'N' ? 'E' : d === 'E' ? 'S' : d === 'S' ? 'W' : 'N'))
  const canSubmit = (Object.keys(UNIT_COUNT) as UnitType[]).every(t => (counter[t] || 0) === UNIT_COUNT[t])
  const remainSec = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))

  // Offset 1px để khớp với background-position của .board-tight
  const OFFSET_PX = 1

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-4 items-start">
      {/* Board */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="px-3 py-1 rounded bg-slate-800">Địa hình: <b>{mapName[mapType]}</b></div>
          <div className="px-3 py-1 rounded bg-slate-800">Thời gian còn: <b>{remainSec}s</b></div>
          <div className="ml-auto flex items-center gap-2">
            <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700" onClick={rotateLeft}  title="Xoay trái (Q)">⟲</button>
            <div className="px-2 py-1 rounded bg-slate-800 text-sm w-8 text-center">{dir}</div>
            <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700" onClick={rotateRight} title="Xoay phải (E/R)">⟳</button>
          </div>
        </div>

        {/* Lưới + nhãn trục */}
        <div className="inline-block">
          {/* Nhãn cột – bù offset khớp lưới */}
          <div
            className="mb-1 grid-axes"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, var(--cell))',
              transform: `translateX(${OFFSET_PX}px)`,
            }}
          >
            {letters.map(c => (
              <div
                key={c}
                style={{ width: 'var(--cell)', height: 'var(--cell)', lineHeight: 'var(--cell)' }}
                className="text-center"
              >
                {c}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Nhãn hàng – bù offset khớp lưới */}
            <div
              className="grid-axes"
              style={{
                display: 'grid',
                gridTemplateRows: 'repeat(12, var(--cell))',
                transform: `translateY(${OFFSET_PX}px)`,
              }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  style={{ width: 'var(--cell)', height: 'var(--cell)', lineHeight: 'var(--cell)' }}
                  className="text-right pr-1"
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Lưới 12x12 – sát nhau, kẻ lưới bằng background */}
            <div
              className="board-tight"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, var(--cell))',
                gridAutoRows: 'var(--cell)',
              }}
            >
              {board.flatMap((row, y) =>
                row.map((c, x) => {
                  const key = `${x},${y}`
                  const placedHere = placed.some(pl =>
                    cellsFor(pl.type, pl.x, pl.y, pl.dir).some(k => k.x === x && k.y === y)
                  )
                  const pv = preview.has(key)
                  const err = hover && pv ? collides(board, placed, selected, hover.x, hover.y, dir) : null
                  const pvState = pv ? (err ? 'bad' : 'ok') : undefined

                  return (
                    <div
                      key={key}
                      className={[
                        'cell',
                        c.o ? 'obstacle' : '',
                        c.h ? 'hit' : '',
                        placedHere ? 'unit' : '',
                      ].join(' ')}
                      data-pv={pvState}                          // ✨ Preview rõ ràng (khớp CSS data-pv)
                      title={`${letters[x]}${y + 1}`}
                      onMouseEnter={() => setHover({ x, y })}
                      onMouseLeave={() => setHover(undefined)}
                      onClick={() => handleCellClick(x, y)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        const hitId = placed.find(pl =>
                          cellsFor(pl.type, pl.x, pl.y, pl.dir).some(k => k.x === x && k.y === y)
                        )?.id
                        if (hitId) setPlaced(p => p.filter(pl => pl.id !== hitId))
                      }}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Palette & actions */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <h3 className="font-semibold mb-3">Xếp quân</h3>

        <div className="space-y-2">
          {(Object.keys(UNIT_COUNT) as UnitType[]).map((t) => {
            const used = counter[t] || 0
            const active = selected === t
            return (
              <button
                key={t}
                onClick={() => setSelected(t)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                  active ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-800'
                } hover:bg-slate-700/70`}
              >
                <span>{UNIT_LABEL[t]}</span>
                <span className="text-sm opacity-80">{used}/{UNIT_COUNT[t]}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700" onClick={clearAll}>Xoá hết</button>
          <button className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700" onClick={randomFill}>Random xếp</button>
          <button
            className={`col-span-2 px-3 py-2 rounded-lg font-semibold ${
              canSubmit ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-800 opacity-60 cursor-not-allowed'
            }`}
            disabled={!canSubmit}
            onClick={() => onSubmit(placed)}
            title={canSubmit ? 'Sẵn sàng' : 'Hãy đặt đủ số lượng'}
          >
            Sẵn sàng
          </button>
        </div>

        <div className="mt-3 text-xs opacity-70">
          Phím tắt: <b>Q/E/R</b> xoay, <b>Right-click</b> để gỡ nhanh.
        </div>
      </div>
    </div>
  )
}
