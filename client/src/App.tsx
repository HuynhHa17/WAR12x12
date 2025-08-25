import { useEffect, useRef, useState, useCallback } from 'react'
import { useGame } from './store'
import type { Board, Dir, Terrain } from './types'
import Lobby from './components/Lobby'
import toast from 'react-hot-toast'
import MapSpinner from './components/MapSpinner'
import BoardEditor from './components/BoardEditor'
import BattleUI from './components/BattleUI'
import LegendBar from './components/LegendBar'
import ChatPanel from './components/ChatPanel'

/* -------------- Helpers ------------ */
function makeEmptyBoard(): Board {
  return Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => ({})))
}

type UnitType = 'commander' | 'artillery' | 'armor' | 'missile' | 'radar'
function rot(dx: number, dy: number, dir: Dir): [number, number] {
  switch (dir) {
    case 'N': return [dx, dy]
    case 'E': return [dy, -dx]
    case 'S': return [-dx, -dy]
    case 'W': return [-dy, dx]
  }
}



function cellsFor(type: UnitType, x: number, y: number, dir: Dir) {
  const out: { x: number; y: number }[] = []
  const stamp = (w: number, h: number) => {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const [rx, ry] = rot(xx, yy, dir)
        out.push({ x: x + rx, y: y + ry })
      }
  }




  if (type === 'commander') stamp(1, 1)
  else if (type === 'artillery') stamp(1, 2)
  else if (type === 'armor') stamp(2, 2)
  else if (type === 'missile') stamp(1, 4)
  else if (type === 'radar') stamp(2, 2)
  return out
}




/* ------------ End modal ------------ */
function reasonText(reason?: string) {
  switch (reason) {
    case 'commander_down': return 'Hạ gục Chỉ huy'
    case 'all_units_down': return 'Đối thủ đã mất toàn bộ đơn vị'
    case 'three_skips': return 'Đối thủ bỏ lượt 3 lần'
    case 'opponent_left': return 'Đối thủ rời trận'
    case 'timeout': return 'Hết giờ'
    case 'eliminate': return 'Tiêu diệt mục tiêu'
    default: return undefined
  }
}




function EndGameModal({
  open, meWin, reason, onRematch, onLeave, waitingRematch
}: {
  open: boolean
  meWin?: boolean
  reason?: string
  waitingRematch?: boolean
  onRematch: () => void
  onLeave: () => void
}) {
  if (!open) return null
  const title = meWin ? '🎉 Chúc mừng! Bạn thắng' : '😢 Chia buồn! Bạn thua'
  const sub = reasonText(reason)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-xl">
        <h3 className="text-xl font-bold mb-1">{title}</h3>
        {sub && <div className="opacity-80 mb-4">Lý do: <b>{sub}</b></div>}

        <div className="flex gap-3 justify-end">
          <button
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50"
            onClick={onRematch}
            disabled={waitingRematch}
          >
            🔁 {waitingRematch ? 'Đang chờ đối thủ…' : 'Chơi lại'}
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold"
            onClick={onLeave}
          >
            ⏏️ Thoát
          </button>
        </div>
      </div>
    </div>
  )
}





/* ============= App ============= */
export default function App() {
  // ❗️BỎ pushMsg khỏi destructuring để không dùng nữa
  const { socket, name, setName, room, setRoom } = useGame()

  // ==== Lobby & Room ====
  const [code, setCode] = useState('')

  // ==== Boards ====
  const [board, setBoard] = useState<Board | undefined>()
  const [enemyView, setEnemyView] = useState<Board>(() => makeEmptyBoard())

  // ==== Turn / ammo ====
  const [ammo, setAmmo] = useState<string | undefined>()
  const [spinDeadline, setSpinDeadline] = useState<number | undefined>()
  const [fireDeadline, setFireDeadline] = useState<number | undefined>()
  const [dir, setDir] = useState<Dir>('N')

  // ==== Placement & map ====
  const [placementActive, setPlacementActive] = useState(false)
  const [mapType, setMapType] = useState<Terrain>('desert')

  // ==== Spinner random map ====
  const [showMapSpin, setShowMapSpin] = useState(false)
  const [spinTarget, setSpinTarget] = useState<Terrain>('desert')
  const [pendingBoard, setPendingBoard] = useState<Board | undefined>()
  const spinTimerRef = useRef<number | null>(null)

  // ==== Tooltip tên đơn vị ====
  const [unitTitles, setUnitTitles] = useState<Record<string, string>>({})

  // ==== End modal ====
  const [endOpen, setEndOpen] = useState(false)
  const [endMeWin, setEndMeWin] = useState<boolean | undefined>(undefined)
  const [endReason, setEndReason] = useState<string | undefined>(undefined)
  const [waitingRematch, setWaitingRematch] = useState(false)

  // repaint countdown
  const [, forceTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 300)
    return () => clearInterval(t)
  }, [])




  // Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'q' || e.key === 'Q') {
        setDir((d) => (d === 'N' ? 'W' : d === 'W' ? 'S' : d === 'S' ? 'E' : 'N'))
      }
      if (e.key === 'e' || e.key === 'E') {
        setDir((d) => (d === 'N' ? 'E' : d === 'E' ? 'S' : d === 'S' ? 'W' : 'N'))
      }
      if (e.code === 'Space') {
        const isMyTurn = room.turn?.current === socket.id
        if (isMyTurn && !ammo && spinDeadline && Date.now() < spinDeadline) {
          e.preventDefault()
          socket.emit('spin:roll')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ammo, spinDeadline, room.turn, socket])

  const mapLabel = (t: Terrain) =>
    ({ desert: 'Sa mạc', jungle: 'Rừng rậm', prairie: 'Thảo nguyên', ice: 'Băng giá' } as const)[t]

  const finalizeMapSpin = () => {
    if (spinTimerRef.current) {
      window.clearTimeout(spinTimerRef.current)
      spinTimerRef.current = null
    }
    if (pendingBoard) setBoard(pendingBoard)
    setPendingBoard(undefined)
    setShowMapSpin(false)
    setMapType(spinTarget)
    setPlacementActive(true)
    toast.success(`Map của bạn: ${mapLabel(spinTarget)}`)
  }

  const startMapSpin = (mt: Terrain, newBoard: Board) => {
    if (spinTimerRef.current) {
      window.clearTimeout(spinTimerRef.current)
      spinTimerRef.current = null
    }
    setSpinTarget(mt)
    setPendingBoard(newBoard)
    setShowMapSpin(true)
    spinTimerRef.current = window.setTimeout(() => finalizeMapSpin(), 1600)
  }




  // helper reset local state
  const resetLocalState = useCallback(() => {
    setBoard(undefined)
    setEnemyView(makeEmptyBoard())
    setAmmo(undefined)
    setSpinDeadline(undefined)
    setFireDeadline(undefined)
    setPlacementActive(false)
    setShowMapSpin(false)
    setUnitTitles({})
    setDir('N')
    setEndOpen(false)
    setEndReason(undefined)
    setEndMeWin(undefined)
    setWaitingRematch(false)
  }, [])




  // lifecycle
  const prevPlayers = useRef<any[] | undefined>(undefined)
  const startedRef = useRef(false)

  useEffect(() => {
    const onRoomCreated = ({ code }: any) => {
      setRoom({ code })
      toast.success('Tạo phòng thành công')
    }




    const onRoomJoined = ({ code }: any) => {
      setRoom({ code })
      toast.success('Vào phòng thành công')
    }

    const onRoomError = ({ message }: any) => toast.error(String(message || 'Có lỗi phòng'))

    const onRoomUpdate = (s: any) => {
      setRoom({ phase: s.phase, players: s.players, turn: s.turn, timers: s.timers })
      const prev = prevPlayers.current || []
      const cur = s.players || []

      const prevIds = new Set(prev.map((p: any) => p.id))
      const curIds = new Set(cur.map((p: any) => p.id))

      cur.forEach((p: any) => { if (!prevIds.has(p.id)) toast(`${p.name || 'Người chơi'} đã vào phòng`) })
      prev.forEach((p: any) => { if (!curIds.has(p.id)) toast(`${p.name || 'Người chơi'} đã rời phòng`) })
      cur.forEach((p: any) => {
        const pv = prev.find((x: any) => x.id === p.id)
        if (pv && pv.ready !== p.ready) toast(p.ready ? `${p.name} sẵn sàng` : `${p.name} hủy sẵn sàng`)
      })

      prevPlayers.current = cur
    }

    const onPlacementStart = ({ mapType, board: serverBoard }: any) => {
      startMapSpin(mapType as Terrain, serverBoard)
    }

    const onTurnBegin = ({ deadline }: any) => {
      setSpinDeadline(deadline)
      setAmmo(undefined)
      if (!startedRef.current) {
        startedRef.current = true
        toast.success('Trận đấu bắt đầu!')
      }
      toast('Đến lượt bạn: quay vòng đạn (≤15s)')
    }

    const onSpinResult = ({ ammo, fireEndsAt }: any) => {
      setAmmo(ammo)
      setFireDeadline(fireEndsAt)
      toast.success(`Bạn nhận được đạn: ${ammo}`)
    }

    const onFireResolve = ({ hits }: any) => {
      setEnemyView((prev) => {
        const c = prev.map((r) => r.map((cell) => ({ ...cell })))
          ; (hits || []).forEach((h: any) => {
            if (c[h.y]?.[h.x]) c[h.y][h.x].h = true
          })
        return c
      })
    }

    const onUnderAttack = ({ hits }: any) => {
      setBoard((b) => {
        if (!b) return b as any
        const c = b.map((r) => r.map((cell) => ({ ...cell })))
          ; (hits || []).forEach((h: any) => {
            if (c[h.y]?.[h.x]) c[h.y][h.x].h = true
          })
        return c as Board
      })
    }

    const onFireError = ({ message }: any) => toast.error(String(message || 'Không thể bắn'))

    // ❌ KHÔNG SUBSCRIBE chat ở đây nữa — đã có trong store.ts
    // const onChat = (m: any) => pushMsg(m)

    const onGameOver = ({ winnerId, reason }: any) => {
      const meWin = !!winnerId && winnerId === socket.id
      setAmmo(undefined)
      setSpinDeadline(undefined)
      setFireDeadline(undefined)
      setEndMeWin(meWin)
      setEndReason(reason)
      setEndOpen(true)

      if (!winnerId) toast('Hết giờ — Hòa!')
      else {
        const label = reasonText(reason) || (meWin ? 'Bạn thắng!' : 'Bạn thua!')
        meWin ? toast.success(label) : toast(label)
      }
    }

    const onRoomReset = () => {
      resetLocalState()
      startedRef.current = false
      toast('Chuẩn bị ván mới — hãy bấm Sẵn sàng')
    }

    const onRoomLeft = () => {
      resetLocalState()
      setRoom({ code: undefined, phase: undefined, players: [], turn: null, timers: {} as any })
      toast('Đã rời phòng')
    }

    // subscribe
    socket.on('room:created', onRoomCreated)
    socket.on('room:joined', onRoomJoined)
    socket.on('room:error', onRoomError)
    socket.on('room:update', onRoomUpdate)
    socket.on('placement:start', onPlacementStart)
    socket.on('turn:begin', onTurnBegin)
    socket.on('spin:result', onSpinResult)
    socket.on('fire:resolve', onFireResolve)
    socket.on('under:attack', onUnderAttack)
    socket.on('fire:error', onFireError)
    // socket.on('chat:message', onChat) // ❌ bỏ
    socket.on('game:over', onGameOver)
    socket.on('room:reset', onRoomReset)
    socket.on('room:left', onRoomLeft)

    return () => {
      socket.off('room:created', onRoomCreated)
      socket.off('room:joined', onRoomJoined)
      socket.off('room:error', onRoomError)
      socket.off('room:update', onRoomUpdate)
      socket.off('placement:start', onPlacementStart)
      socket.off('turn:begin', onTurnBegin)
      socket.off('spin:result', onSpinResult)
      socket.off('fire:resolve', onFireResolve)
      socket.off('under:attack', onUnderAttack)
      socket.off('fire:error', onFireError)
      // socket.off('chat:message', onChat) // ❌ bỏ
      socket.off('game:over', onGameOver)
      socket.off('room:reset', onRoomReset)
      socket.off('room:left', onRoomLeft)

      if (spinTimerRef.current) {
        window.clearTimeout(spinTimerRef.current)
        spinTimerRef.current = null
      }
    }
  }, [socket, setRoom, resetLocalState])

  // ==== UI states ====
  const inLobby = !room.phase || room.phase === 'waiting'

  // modal handlers
  const handleRematch = () => {
    setWaitingRematch(true)
    socket.emit('room:rematch')
    toast('Đã gửi yêu cầu chơi lại — chờ đối thủ…')
  }
  const handleLeave = () => {
    socket.emit('room:leave')
  }

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">War12x12 — MVP</h1>

      {!room.code && (
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col">
            <label className="text-sm opacity-70">Tên của bạn</label>
            <input
              className="px-3 py-2 bg-slate-800 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Ha"
            />
          </div>
          <button
            className="px-3 py-2 bg-emerald-600 rounded"
            onClick={() => {
              socket.emit('player:setName', { name })
              socket.emit('room:create')
            }}
          >
            Tạo phòng
          </button>
          <input
            className="px-3 py-2 bg-slate-800 rounded"
            placeholder="Mã phòng 6 số"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-sky-600 rounded"
            onClick={() => {
              socket.emit('player:setName', { name })
              socket.emit('room:join', { code })
            }}
          >
            Vào phòng
          </button>
        </div>
      )}

      {room.code && (
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded bg-slate-800">
              Mã phòng: <b>{room.code}</b>
            </div>
          </div>

          {!inLobby && <div className="mt-3"><LegendBar /></div>}

          {inLobby && (
            <>
              <Lobby />
              <div className="mt-6">
                <ChatPanel />
              </div>
            </>
          )}

          {!inLobby && placementActive && board && (
            <>
              <BoardEditor
                board={board}
                mapType={mapType}
                onSubmit={(units) => {
                  const LABEL: Record<UnitType, string> = {
                    commander: 'Chỉ huy (1x1)',
                    artillery: 'Pháo (1x2)',
                    armor: 'Thiết giáp (2x2)',
                    missile: 'Tên lửa (1x4)',
                    radar: 'Ra-đa (2x2)',
                  }
                  const b2 = board.map((r) => r.map((c) => ({ ...c, u: false })))
                  const nameMap: Record<string, string> = {}
                    ; (units as Array<{ type: UnitType; x: number; y: number; dir: Dir }>).forEach((u) => {
                      const cells = cellsFor(u.type, u.x, u.y, u.dir)
                      const uname = LABEL[u.type]
                      cells.forEach((cell) => {
                        const cellObj = b2[cell.y]?.[cell.x]
                        if (cellObj) {
                          cellObj.u = true
                            ; (cellObj as any).uname = uname
                          nameMap[`${cell.x},${cell.y}`] = uname
                        }
                      })
                    })
                  setBoard(b2)
                  setUnitTitles(nameMap)
                  socket.emit('placement:done', { units })
                  setPlacementActive(false)
                  toast.success('Đã sẵn sàng — chờ đối thủ')
                }}
              />
              <div className="mt-6">
                <ChatPanel />
              </div>
            </>
          )}

          {!inLobby && !placementActive && board && (
            <>
              <div className="mt-6">
                <BattleUI
                  myBoard={board}
                  enemyBoard={enemyView}
                  ammo={ammo}
                  dir={dir}
                  setDir={setDir}
                  spinDeadline={spinDeadline}
                  fireDeadline={fireDeadline}
                  onSpin={() => socket.emit('spin:roll')}
                  onFire={(x, y) => {
                    const isMyTurn = room.turn?.current === socket.id
                    if (!isMyTurn) return
                    if (!ammo || !fireDeadline || Date.now() >= fireDeadline) return
                    socket.emit('fire:shoot', { x, y, dir, ammo })
                  }}
                  unitTitles={unitTitles}
                />
              </div>
              <div className="mt-6">
                <ChatPanel />
              </div>
            </>
          )}

          {!inLobby && !placementActive && !board && (
            <div className="mt-6 opacity-70">Chờ bắt đầu / random map...</div>
          )}
        </div>
      )}

      {showMapSpin && <MapSpinner target={spinTarget} onDone={finalizeMapSpin} />}

      <EndGameModal
        open={endOpen}
        meWin={endMeWin}
        reason={endReason}
        onRematch={handleRematch}
        onLeave={handleLeave}
        waitingRematch={waitingRematch}
      />
    </div>
  )
}
