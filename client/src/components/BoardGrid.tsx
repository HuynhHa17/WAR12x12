import { useEffect, useMemo, useRef, useState } from 'react';
import type { Board, Dir } from '../types';

type Point = { x: number; y: number };
type ImpactLite = { x: number; y: number; kind: 'hit'; at: number };

const letters = 'ABCDEFGHIJKL'.split('');
const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < 12 && y < 12;

function shapeCells(x: number, y: number, dir: Dir, ammo?: string): Point[] {
  if (!ammo) return [];
  const d: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const [dx, dy] = d[dir];
  const out: Point[] = [];
  const push = (ix: number, iy: number) => { if (inBounds(ix, iy)) out.push({ x: ix, y: iy }); };

  switch (ammo) {
    case '1x1': push(x, y); break;
    case '1x2': push(x, y); push(x + dx, y + dy); break;
    case '1x3': push(x, y); push(x + dx, y + dy); push(x + 2 * dx, y + 2 * dy); break;
    case '2x2': push(x, y); push(x + 1, y); push(x, y + 1); push(x + 1, y + 1); break;
    case 'burst': push(x, y); break;
    case 'radar':
      for (let i = -2; i <= 2; i++) (dir === 'E' || dir === 'W') ? push(x + i, y) : push(x, y + i);
      push(x, y);
      break;
  }
  return out;
}

export default function BoardGrid({
  board,
  ammo,
  dir,
  target,
  setTarget,
  canFire,
  onFire,
  showUnits = false,
  showLegend = false,
  fxKeys,
  unitTitles,
  unitHitKeys,               // 👈 nhận từ parent: các ô “đã trúng quân”
}: {
  board: Board;
  ammo?: string;
  dir: Dir;
  target?: Point;
  setTarget?: (p?: Point) => void;
  canFire?: boolean;
  onFire?: (x: number, y: number) => void;
  showUnits?: boolean;
  showLegend?: boolean;
  fxKeys?: Set<string>;
  unitTitles?: Record<string, string>;
  unitHitKeys?: Set<string>;
}) {
  const [hover, setHover] = useState<Point | undefined>();

  /* FX ngắn khi có ô MỚI bị trúng (để flash/ring/smoke) */
  const prevHitSet = useRef<Set<string>>(new Set());
  const [impacts, setImpacts] = useState<ImpactLite[]>([]);
  useEffect(() => {
    const cur = new Set<string>();
    board.forEach((row, y) => row.forEach((c, x) => { if (c.h) cur.add(`${x},${y}`); }));

    const newly: string[] = [];
    cur.forEach(k => { if (!prevHitSet.current.has(k)) newly.push(k); });

    if (newly.length) {
      const now = Date.now();
      setImpacts(prev => [
        ...prev,
        ...newly.map(k => {
          const [x, y] = k.split(',').map(n => parseInt(n, 10));
          return { x, y, kind: 'hit', at: now } as const;
        }),
      ]);
    }

    prevHitSet.current = cur;

    const t = setTimeout(() => {
      const cutoff = Date.now() - 800;
      setImpacts(prev => prev.filter(im => im.at >= cutoff));
    }, 900);
    return () => clearTimeout(t);
  }, [board]);

  const impAt = useMemo(() => {
    const m = new Map<string, ImpactLite>();
    for (const im of impacts) {
      const key = `${im.x},${im.y}`;
      const old = m.get(key);
      if (!old || im.at > old.at) m.set(key, im);
    }
    return m;
  }, [impacts]);

  // Preview vùng bắn
  const preview = useMemo(() => {
    if (!canFire || !ammo) return new Set<string>();
    const src = hover ?? target;
    if (!src) return new Set<string>();
    return new Set(shapeCells(src.x, src.y, dir, ammo).map(p => `${p.x},${p.y}`));
  }, [hover, target, dir, ammo, canFire]);

  const rowLabelWidth = 'calc(var(--cell) * 0.9)';
  const rowGap = '0.25rem';

  return (
    <div className="inline-block">
      {/* Cột A–L */}
      <div
        className="grid-axes mb-1 axes-cols"
        style={{
          marginLeft: `calc(${rowLabelWidth} + ${rowGap})`,
          display: 'grid',
          gridTemplateColumns: 'repeat(12, var(--cell))',
        }}
      >
        {letters.map(c => (
          <div key={c} className="text-center" style={{ width: 'var(--cell)', height: 'var(--cell)', lineHeight: 'var(--cell)' }}>
            {c}
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: 0 }}>
        {/* Hàng 1–12 */}
        <div
          className="grid-axes axes-rows"
          style={{ display: 'grid', gridTemplateRows: 'repeat(12, var(--cell))', marginRight: rowGap }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="text-right pr-1"
              style={{ width: rowLabelWidth, height: 'var(--cell)', lineHeight: 'var(--cell)' }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Lưới 12×12 */}
        <div className="board-tight">
          {board.flatMap((row, y) =>
            row.map((c, x) => {
              const key = `${x},${y}`;
              const isHit = !!c.h;
              const isHitUnit = isHit && !!unitHitKeys?.has(key); // ✅ duy nhất dựa theo unitHitKeys

              const base =
                'relative cell ' +
                (c.o ? 'obstacle ' : '') +
                (showUnits && c.u ? 'unit ' : '') +   // chỉ hiện “màu đơn vị” trên bản đồ của mình
                (isHit ? 'hit ' : '') +
                (isHitUnit ? 'hit-unit ' : '') +      // 💛 vàng đậm
                (fxKeys?.has(key) ? ' animate-ping-slow ' : '') +
                (impAt.has(key) ? ' shake-xs ' : '');

              const tipCoord = `${letters[x]}${y + 1}`;
              const title = unitTitles?.[key] ? `${unitTitles[key]} — (${tipCoord})` : `(${tipCoord})`;

              const isPv = preview.has(key);

              return (
                <div
                  key={key}
                  data-x={x}
                  data-y={y}
                  data-can-fire={!!canFire}
                  {...(isPv ? { 'data-pv': 'ok' } : {})}
                  className={base + (canFire ? ' cursor-pointer ' : '')}
                  title={title}
                  onMouseEnter={() => setHover({ x, y })}
                  onMouseLeave={() => setHover(undefined)}
                  onClick={() => {
                    setTarget?.({ x, y });
                    if (canFire && onFire) onFire(x, y);
                  }}
                >
                  {/* FX ngắn khi vừa trúng */}
                  {impAt.has(key) && (
                    <>
                      <span aria-hidden className="absolute inset-0 hit-flash" />
                      <span aria-hidden className="ring-base ring-hit" />
                      <span aria-hidden className="hit-smoke" />
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showLegend && (
        <div className="mt-3 flex gap-3 text-xs opacity-70 select-none">
          <Legend sw="bg-emerald-700/80" label="Ô có đơn vị" />
          <Legend sw="bg-red-600/70" label="Ô đã trúng" />
          <Legend sw="outline outline-2 outline-amber-400" label="Vùng bắn dự kiến" />
        </div>
      )}
    </div>
  );
}

function Legend({ sw, label }: { sw: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${sw}`} />
      <span>{label}</span>
    </div>
  );
}
