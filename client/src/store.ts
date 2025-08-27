import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { Board, Terrain } from './types'

export type PlayerLite = { id: string; name: string; ready?: boolean; me?: boolean }

type Timers = {
  placingEndsAt?: number | null
  spinEndsAt?: number | null
  fireEndsAt?: number | null
  gameEndsAt?: number | null
}
type RoomPhase = 'waiting' | 'placing' | 'coin' | 'playing' | 'ended'
type RoomState = {
  code?: string
  phase?: RoomPhase
  players?: PlayerLite[]
  timers?: Timers
  turn?: { current: string } | null
  winnerId?: string | null
  reason?: string | null
}
type ChatMsg = { from: string; text: string; emoji?: string; ts: number }

interface State {
  name: string
  setName: (s: string) => void
  socket: Socket

  room: RoomState
  setRoom: (p: Partial<RoomState>) => void

  myBoard?: Board
  enemyBoard?: Board
  terrain?: Terrain
  deadline?: number

  /** Ô có QUÂN bị trúng (để tô vàng đậm) */
  enemyUnitHitKeys: Set<string>
  myUnitHitKeys: Set<string>

  messages: ChatMsg[]
  pushMsg: (m: ChatMsg) => void
  clearMessages: () => void
}

const initialName =
  (typeof window !== 'undefined' && window.localStorage?.getItem('war12_name')) || ''

declare global {
  interface Window {
    __WAR12_SOCKET__?: Socket
    __WAR12_SOCKET_WIRED__?: boolean
  }
}

const endpoint = (import.meta as any).env?.VITE_WS_URL ?? 'http://localhost:3000'
const socket: Socket =
  (typeof window !== 'undefined' && window.__WAR12_SOCKET__) ||
  io(endpoint, { transports: ['websocket'], reconnection: true, reconnectionAttempts: 8 })

if (typeof window !== 'undefined' && !window.__WAR12_SOCKET__) {
  window.__WAR12_SOCKET__ = socket
}

export const useGame = create<State>()((set, get) => ({
  name: initialName,
  setName: (s) => {
    set({ name: s })
    try { window.localStorage?.setItem('war12_name', s) } catch {}
    try { socket.emit('player:setName', { name: s }) } catch {}
  },

  socket,

  room: { players: [], phase: 'waiting', timers: {} },
  setRoom: (p) =>
    set((s) => ({
      room: { ...s.room, ...p, timers: { ...(s.room.timers || {}), ...(p.timers || {}) } },
    })),

  myBoard: undefined,
  enemyBoard: undefined,
  enemyUnitHitKeys: new Set<string>(),
  myUnitHitKeys: new Set<string>(),

  messages: [],
  pushMsg: (m) =>
    set((state) => {
      const next = [...state.messages, m]
      if (next.length > 200) next.splice(0, next.length - 200)
      return { messages: next }
    }),
  clearMessages: () => set({ messages: [] }),
}))

;(function wireSocketOnce() {
  if (typeof window !== 'undefined' && window.__WAR12_SOCKET_WIRED__) return

  socket.off('room:update')
  socket.off('chat:message')
  socket.off('fire:resolve')
  socket.off('under:attack')
  socket.off('connect')

  socket.on('connect', () => {
    const name = useGame.getState().name
    if (name) socket.emit('player:setName', { name })
  })

  socket.on('room:update', (state: RoomState) => {
    useGame.getState().setRoom(state)
  })

  // Bạn bắn -> hits trên BẢN ĐỒ ĐỊCH
  socket.on('fire:resolve', ({ hits }: { hits: Array<{x:number;y:number;unit?:string|null}> }) => {
    if (!hits?.length) return
    useGame.setState((s) => {
      const nextSet = new Set(s.enemyUnitHitKeys)
      const eb = s.enemyBoard ? s.enemyBoard.map(r => r.map(c => ({ ...c }))) : s.enemyBoard
      for (const h of hits) {
        if (eb) {
          eb[h.y][h.x].h = true
          // lưu unit nếu server có gửi (để lần sau vẫn vàng)
          if (h.unit) eb[h.y][h.x].u = h.unit as any
        }
        if (h.unit) nextSet.add(`${h.x},${h.y}`)
      }
      return { enemyBoard: eb, enemyUnitHitKeys: nextSet }
    })
  })

  // Địch bắn -> hits trên BẢN ĐỒ MÌNH
  socket.on('under:attack', ({ hits }: { hits: Array<{x:number;y:number;unit?:string|null}> }) => {
    if (!hits?.length) return
    useGame.setState((s) => {
      const nextSet = new Set(s.myUnitHitKeys)
      const mb = s.myBoard ? s.myBoard.map(r => r.map(c => ({ ...c }))) : s.myBoard
      for (const h of hits) {
        if (mb) {
          mb[h.y][h.x].h = true
          if (mb[h.y][h.x].u) nextSet.add(`${h.x},${h.y}`)
        }
      }
      return { myBoard: mb, myUnitHitKeys: nextSet }
    })
  })

  socket.on('chat:message', (m: ChatMsg) => {
    useGame.getState().pushMsg(m)
  })

  if (typeof window !== 'undefined') window.__WAR12_SOCKET_WIRED__ = true
})()
