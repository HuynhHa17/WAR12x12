import { useEffect, useMemo } from 'react' 
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../store'
import toast from 'react-hot-toast' 

type PlayerLite = { id: string; name: string; ready: boolean; me?: boolean }

export default function Lobby() {
  const { room, socket } = useGame()
  const players: PlayerLite[] = room.players ?? []

  const me = useMemo(() => players.find((p) => p.me), [players])
  const opp = useMemo(() => players.find((p) => !p.me), [players])
  const bothReady = !!(players.length === 2 && players.every((p) => p.ready))

  useEffect(() => {                                       // <== thông báo khi đủ 2 sẵn sàng
    if (bothReady) toast.success('Cả hai đã sẵn sàng! Chuẩn bị bắt đầu…')
  }, [bothReady])

  const toggleReady = () => {
    const nowReady = !(me?.ready)
    socket.emit('player:ready', { ready: nowReady })
    
    toast(nowReady ? 'Bạn đã đánh dấu Sẵn sàng' : 'Bạn đã hủy Sẵn sàng')   // <==
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code || '')
      toast.success('Đã sao chép mã phòng')                                 // <==
    } catch {
      toast.error('Không sao chép được mã phòng')                           // <==
    }
  }

  return (
    <div className="mt-6 grid md:grid-cols-3 gap-6">
      {/* Cột trái: Thông tin phòng */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800"
      >
        <div className="text-sm opacity-70">Mã phòng</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="px-3 py-1 rounded bg-slate-800 font-semibold tracking-wider">
            {room.code}
          </div>
          <button
            onClick={copyCode}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm"
          >
            Sao chép
          </button>
        </div>

        <div className="mt-4 text-sm opacity-70">Trạng thái</div>
        <div className="mt-1">
          <span
            className={
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ' +
              (bothReady ? 'bg-emerald-600/20 text-emerald-300' : 'bg-amber-600/20 text-amber-300')
            }
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {bothReady ? 'Cả hai đã sẵn sàng' : 'Đang chờ người chơi'}
          </span>
        </div>

        <button
          onClick={toggleReady}
          className={
            'mt-4 w-full px-4 py-2 rounded-xl font-medium transition ' +
            (me?.ready
              ? 'bg-rose-600 hover:bg-rose-500'
              : 'bg-emerald-600 hover:bg-emerald-500')
          }
        >
          {me?.ready ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
        </button>

        <p className="mt-3 text-xs opacity-70">
          Khi cả 2 người chơi sẵn sàng, trò chơi sẽ tự chuyển sang giai đoạn tiếp theo.
        </p>
      </motion.div>

      {/* Cột giữa: Người chơi */}
      <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
        {/* Slot của bạn */}
        <PlayerCard
          title="Bạn"
          player={me}
          placeholder="Đang vào..."
          accent="from-emerald-600/30 to-emerald-400/10"
        />

        {/* Slot đối thủ */}
        <PlayerCard
          title="Đối thủ"
          player={opp}
          placeholder="Đang chờ người chơi..."
          accent="from-sky-600/30 to-sky-400/10"
        />
      </div>
    </div>
  )
}

function PlayerCard({
  title,
  player,
  placeholder,
  accent,
}: {
  title: string
  player?: PlayerLite
  placeholder: string
  accent: string
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
    >
      <div className="absolute inset-0 pointer-events-none opacity-70 bg-gradient-to-br blur-xl -z-0" style={{ backgroundImage: `linear-gradient(135deg, transparent, rgba(255,255,255,0.03))` }} />

      <div className="text-sm opacity-70">{title}</div>

      <AnimatePresence mode="popLayout">
        {player ? (
          <motion.div
            key="filled"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 flex items-center gap-4"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 grid place-items-center font-bold">
                {avatarInitials(player.name)}
              </div>
              <span
                className={
                  'absolute -right-1 -bottom-1 w-3 h-3 rounded-full ring-2 ring-slate-900 ' +
                  (player.ready ? 'bg-emerald-400' : 'bg-amber-400')
                }
                title={player.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{player.name || 'Player'}</div>
              <div className="text-xs opacity-70">
                {player.ready ? 'Sẵn sàng' : 'Đang chuẩn bị...'}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3"
          >
            <div className="h-12 rounded-xl bg-gradient-to-r from-slate-800 via-slate-700/60 to-slate-800 animate-pulse" />
            <div className="mt-2 text-xs opacity-70">{placeholder}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* dải nhấn nhá */}
      <div className={`absolute inset-x-0 -bottom-10 h-28 blur-2xl opacity-60 pointer-events-none bg-gradient-to-tr ${accent}`} />
    </motion.div>
  )
}

function avatarInitials(name?: string) {
  if (!name) return 'P'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase().slice(0, 2)
}
