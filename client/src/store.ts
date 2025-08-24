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

type RoomPhase = 'waiting' | 'placing'  | 'coin' | 'playing' | 'ended'
type RoomState = {
  code?: string
  phase?: RoomPhase
  players?: PlayerLite[]
  timers?: Timers
  // server chỉ gửi current (xem roomPublicState ở server)
  turn?: { current: string } | null
  // server có đẩy ra khi endGame()
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
  terrain?: Terrain
  deadline?: number

  messages: ChatMsg[]
  pushMsg: (m: ChatMsg) => void
  clearMessages: () => void
}

/** Lấy tên đã lưu (nếu có) */
const initialName =
  (typeof window !== 'undefined' && window.localStorage?.getItem('war12_name')) || ''

/** Socket singleton (tránh tạo thêm khi HMR) */
declare global {
  interface Window {
    __WAR12_SOCKET__?: Socket
    __WAR12_SOCKET_WIRED__?: boolean
  }
}

const endpoint = (import.meta as any).env?.VITE_WS_URL ?? 'http://localhost:3000'
const socket: Socket =
  (typeof window !== 'undefined' && window.__WAR12_SOCKET__) ||
  io(endpoint, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 8,
  })

if (typeof window !== 'undefined' && !window.__WAR12_SOCKET__) {
  window.__WAR12_SOCKET__ = socket
}

/** Zustand store */
export const useGame = create<State>()((set, get) => ({
  name: initialName,
  setName: (s) => {
    set({ name: s })
    try { window.localStorage?.setItem('war12_name', s) } catch {}
    // đồng bộ tên lên server nếu đã kết nối
    try { socket.emit('player:setName', { name: s }) } catch {}
  },

  socket,

  room: { players: [], phase: 'waiting', timers: {} },
  setRoom: (p) =>
    set((s) => ({
      room: {
        ...s.room,
        ...p,
        timers: { ...(s.room.timers || {}), ...(p.timers || {}) }, // merge sâu timers
      },
    })),

  messages: [],
  pushMsg: (m) =>
    set((state) => {
      const next = [...state.messages, m]
      // giữ tối đa 200 tin gần nhất để tránh phình bộ nhớ
      if (next.length > 200) next.splice(0, next.length - 200)
      return { messages: next }
    }),
  clearMessages: () => set({ messages: [] }),
}))

/** Gắn listener nền đồng bộ vào store (một lần duy nhất) */
;(function wireSocketOnce() {
  if (typeof window !== 'undefined' && window.__WAR12_SOCKET_WIRED__) return

  // Dọn listener cũ (an toàn khi HMR)
  socket.off('room:update')
  socket.off('chat:message')
  socket.off('connect')

  socket.on('connect', () => {
    // re-sync tên sau khi reconnect
    const name = useGame.getState().name
    if (name) socket.emit('player:setName', { name })
  })

  socket.on('room:update', (state: RoomState) => {
    useGame.getState().setRoom(state)
  })

  socket.on('chat:message', (m: ChatMsg) => {
    useGame.getState().pushMsg(m)
  })

  if (typeof window !== 'undefined') window.__WAR12_SOCKET_WIRED__ = true
})()
