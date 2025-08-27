import { useEffect, useRef, useState } from 'react';
import type { Board, Dir } from '../types';
import { useGame } from '../store';
import BoardGrid from './BoardGrid';
import AmmoSpinner, { type Ammo } from './AmmoSpinner';

/* ---------------- TimerRing ---------------- */
function TimerRing({
  endsAt,
  label,
  totalMs = 60_000,
}: {
  endsAt?: number;
  label: string;
  totalMs?: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;

  const remain = Math.max(0, endsAt - now);
  const pct = Math.max(0, Math.min(1, remain / totalMs));
  const deg = 360 * pct;

  return (
    <div className="flex items-center gap-3" aria-label={label}>
      <div
        className="w-10 h-10 rounded-full grid place-items-center text-xs font-semibold"
        style={{ background: `conic-gradient(#38bdf8 ${deg}deg,#334155 ${deg}deg 360deg)` }}
      >
        <div className="w-7 h-7 rounded-full bg-slate-900 grid place-items-center">
          {Math.ceil(remain / 1000)}
        </div>
      </div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

/* ---------------- BattleUI ---------------- */
export default function BattleUI({
  myBoard,
  enemyBoard,
  ammo,
  dir,
  setDir,
  spinDeadline,
  fireDeadline,
  fxMine,
  fxEnemy,
  onSpin,
  onFire,
  unitTitles,
}: {
  myBoard: Board;
  enemyBoard: Board;
  ammo?: Ammo;
  dir: Dir;
  setDir: (d: Dir) => void;
  spinDeadline?: number;
  fireDeadline?: number;
  fxMine?: Set<string>;
  fxEnemy?: Set<string>;
  onSpin: () => void;
  onFire: (x: number, y: number) => void;
  unitTitles?: Record<string, string>;
}) {
  const { socket, room } = useGame();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const me  = room.players?.find(p => p.id === socket.id)?.name || 'Bạn';
  const opp = room.players?.find(p => p.id !== socket.id)?.name || 'Đối thủ';

  const isMyTurn = room.turn?.current === socket.id;
  const canSpin  = isMyTurn && !ammo && !!spinDeadline && now < spinDeadline;
  const canFire  = isMyTurn && !!ammo && !!fireDeadline && now < fireDeadline;
  const yourTurn = canSpin || canFire;

  // Giữ ô đang ngắm trên lưới đối thủ để preview luôn hiện
  const [enemyTarget, setEnemyTarget] = useState<{ x: number; y: number } | undefined>();
  useEffect(() => { setEnemyTarget(undefined); }, [ammo]);

  // Overlay vòng xoay đạn khi ammo thay đổi (debounce theo prev ref để tránh strict-mode double render)
  const prevAmmoRef = useRef<Ammo | undefined>(undefined);
  const [showAmmoSpin, setShowAmmoSpin] = useState(false);
  useEffect(() => {
    if (ammo && ammo !== prevAmmoRef.current) setShowAmmoSpin(true);
    prevAmmoRef.current = ammo;
  }, [ammo]);

  // Q/E xoay, Space quay đạn (chỉ khi được phép)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'q' || e.key === 'Q') {
        setDir(dir === 'N' ? 'W' : dir === 'W' ? 'S' : dir === 'S' ? 'E' : 'N');
      } else if (e.key === 'e' || e.key === 'E') {
        setDir(dir === 'N' ? 'E' : dir === 'E' ? 'S' : dir === 'S' ? 'W' : 'N');
      } else if (e.code === 'Space' && canSpin) {
        e.preventDefault();
        onSpin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dir, setDir, canSpin, onSpin]);

  return (
    <div className="space-y-5">
      {/* Banner lượt */}
      <div
        className={`px-3 py-2 rounded-lg ${
          yourTurn
            ? 'bg-emerald-600/20 border border-emerald-500/40'
            : 'bg-slate-800/60 border border-slate-700'
        }`}
        role="status"
        aria-live="polite"
      >
        {yourTurn ? (
          <>
            <b>Đến lượt bạn.</b>{' '}
            <span className="opacity-70 text-sm">Q/E xoay, Space quay đạn</span>
          </>
        ) : (
          <>Đang chờ <b>{opp}</b>…</>
        )}
      </div>

      {/* Thanh điều khiển */}
      <div className="glass p-3 rounded-xl grid gap-3 md:grid-cols-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Trạng thái:</span>
          {!ammo ? (
            <span className="badge">Chưa có đạn</span>
          ) : (
            <span className="badge">
              Có đạn: <b>{ammo}</b>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">Hướng:</span>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              onClick={() => setDir(dir === 'N' ? 'W' : dir === 'W' ? 'S' : dir === 'S' ? 'E' : 'N')}
              title="Q"
            >
              ⟲
            </button>
            <div className="w-8 text-center px-2 py-1 rounded bg-slate-800">{dir}</div>
            <button
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              onClick={() => setDir(dir === 'N' ? 'E' : dir === 'E' ? 'S' : dir === 'S' ? 'W' : 'N')}
              title="E"
            >
              ⟳
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-6">
          {!ammo ? (
            <TimerRing endsAt={spinDeadline} label="Quay vòng đạn (≤15s)" totalMs={15_000} />
          ) : (
            <TimerRing endsAt={fireDeadline} label="Thực hiện lệnh (≤60s)" totalMs={60_000} />
          )}
        </div>
      </div>

      {/* Hai bản đồ */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Bản đồ của bạn */}
        <div className="glass p-3 rounded-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Bản đồ của bạn — {me}</h3>
          </div>
          <BoardGrid
            board={myBoard}
            ammo={undefined}   // không preview trên lưới của mình
            dir={dir}
            showUnits
            showLegend={false}
            fxKeys={fxMine}
            unitTitles={unitTitles}
          />
          <div className="mt-2 text-xs opacity-70">Gợi ý: rê chuột lên ô xanh để xem tên đơn vị.</div>
        </div>

        {/* Bản đồ đối thủ (nơi bắn) */}
        <div className="glass p-3 rounded-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Bản đồ đối thủ — {opp}</h3>
            <button
              className="button font-semibold"
              disabled={!canSpin}
              onClick={onSpin}
              title="Space để quay nhanh"
            >
              🎰 Quay vòng đạn
            </button>
          </div>
          <BoardGrid
            board={enemyBoard}
            ammo={ammo}            // cần để vẽ demo vùng bắn
            dir={dir}
            target={enemyTarget}   // giữ/hiển thị preview ổn định
            setTarget={setEnemyTarget}
            canFire={canFire}
            onFire={(x, y) => {
              setEnemyTarget({ x, y });
              if (canFire) onFire(x, y);
            }}
            showUnits={false}
            showLegend={false}
            fxKeys={fxEnemy}
          />
          <div className="mt-2 text-xs opacity-70">
            Mẹo: Rê chuột để thấy <b>vùng bắn dự kiến</b> (viền vàng). Q/E đổi hướng. Space quay đạn.
          </div>
        </div>
      </div>

      {/* Overlay vòng xoay đạn */}
      {showAmmoSpin && ammo && (
        <AmmoSpinner
          target={ammo}
          onDone={() => setShowAmmoSpin(false)}
          // spins={3}
          // size={288}
          // duration={1.6}
        />
      )}
    </div>
  );
}
