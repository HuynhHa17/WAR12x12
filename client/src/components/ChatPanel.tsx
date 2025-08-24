import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'

const EMOJIS = [
  { k: 'cuoi',       ch: '😄', label: 'Cười' },
  { k: 'tuc',       ch: '😡', label: 'Tức' },
  { k: 'khoc',      ch: '😢', label: 'Khóc' },
  { k: 'bungchay',  ch: '🔥', label: 'Bùng cháy' },
  { k: 'bangcheo',  ch: '❌', label: 'Bằng chéo' },
  { k: 'chocgheo',  ch: '😜', label: 'Chọc ghẹo' },
  { k: 'chokeo',    ch: '🍬', label: 'Cho kẹo' },
]

export default function ChatPanel() {
  const { socket, room, messages } = useGame()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const meName = room.players?.find(p => p.me)?.name || 'Bạn'

  const sendText = () => {
    const t = text.trim()
    if (!t) return
    socket.emit('chat:send', { text: t })
    setText('')
  }

  const sendEmoji = (ch: string) => {
    socket.emit('chat:send', { text: '', emoji: ch })
  }

  useEffect(() => {
    // auto scroll to bottom on new msg
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="glass card p-4 border border-slate-700">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">Trò chuyện</h3>
        <div className="flex flex-wrap gap-1">
          {EMOJIS.map(e => (
            <button
              key={e.k}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              title={e.label}
              onClick={() => sendEmoji(e.ch)}
            >
              <span className="text-xl leading-none">{e.ch}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        className="h-56 overflow-y-auto rounded-lg border border-slate-700/60 p-3 bg-slate-900/40"
      >
        {messages.length === 0 && (
          <div className="opacity-60 text-sm">Hãy gửi lời chào cho đối thủ 👋</div>
        )}
        <div className="space-y-2">
          {messages.map((m, i) => {
            const mine = m.from === meName
            return (
              <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm
                  ${mine ? 'bg-sky-600/70' : 'bg-slate-800/80'}
                `}>
                  <div className="text-[11px] opacity-70 mb-0.5">{mine ? 'Bạn' : m.from}</div>
                  {m.emoji ? (
                    <div className="text-2xl leading-none">{m.emoji}</div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          className="flex-1 px-3 py-2 bg-slate-800 rounded border border-slate-700"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhắn gì đó… (Enter để gửi)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendText()
            }
          }}
        />
        <button
          className="button"
          onClick={sendText}
        >Gửi</button>
      </div>
    </div>
  )
}
