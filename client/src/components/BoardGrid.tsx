import { useMemo, useState } from 'react';
import type { Board, Dir } from '../types';

type Point = { x: number; y: number };
const letters = 'ABCDEFGHIJKL'.split('');

const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < 12 && y < 12;

function shapeCells(x: number, y: number, dir: Dir, ammo?: string): Point[] {
  if (!ammo) return [];
  const d: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const [dx, dy] = d[dir];
  const out: Point[] = [];
  const hit = (ix: number, iy: number) => { if (inBounds(ix, iy)) out.push({ x: ix, y: iy }); };

  switch (ammo) {
    case '1x1': hit(x, y); break;
    case '1x2': hit(x, y); hit(x + dx, y + dy); break;
    case '1x3': hit(x, y); hit(x + dx, y + dy); hit(x + 2 * dx, y + 2 * dy); break;
    case '2x2': hit(x, y); hit(x + 1, y); hit(x, y + 1); hit(x + 1, y + 1); break;
    // ✅ Burst/random: chỉ preview 1 ô tâm
    case 'burst': hit(x, y); break;
    case 'radar':
      hit(x, y);
      for (let i = -2; i <= 2; i++) (dir === 'E' || dir === 'W') ? hit(x + i, y) : hit(x, y + i);
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
}) {
  const [hover, setHover] = useState<Point | undefined>();

  // Chỉ tính preview khi đang được phép bắn & có ammo
  const preview = useMemo(() => {
    if (!canFire || !ammo) return new Set<string>();
    const src = hover ?? target;
    if (!src) return new Set<string>();
    return new Set(shapeCells(src.x, src.y, dir, ammo).map(p => `${p.x},${p.y}`));
  }, [hover, target, dir, ammo, canFire]);

  const rowLabelWidth = 'calc(var(--cell) * 0.9)';   // chiều rộng cột số hàng
  const rowGap = '0.25rem';                          // khoảng cách giữa số hàng và bảng

  return (
    <div className="inline-block">
      {/* Nhãn cột A–L: bù width số hàng + gap + --grid-off để khớp tuyệt đối */}
      <div
        className="select-none text-xs opacity-70 mb-1"
        style={{
          marginLeft: `calc(${rowLabelWidth} + ${rowGap} + var(--grid-off, 0px))`,
          display: 'grid',
          gridTemplateColumns: 'repeat(12, var(--cell))',
        }}
      >
        {letters.map(c => (
          <div
            key={c}
            className="text-center"
            style={{ width: 'var(--cell)', height: 'var(--cell)', lineHeight: 'var(--cell)' }}
          >
            {c}
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: 0 }}>
        {/* Nhãn hàng 1–12: bù --grid-off để thẳng hàng theo chiều dọc */}
        <div
          className="select-none text-xs opacity-70"
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(12, var(--cell))',
            marginTop: 'var(--grid-off, 0px)',
            marginRight: rowGap,
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="text-right pr-1"
              style={{
                width: rowLabelWidth,
                height: 'var(--cell)',
                lineHeight: 'var(--cell)',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Lưới 12x12 – kẻ bằng background (.board-tight trong CSS) */}
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
              const key = `${x},${y}`;
              const isHit = !!c.h;
              const hasUnit = showUnits && !!c.u;

              // Preview chỉ khi canFire + ammo
              const pvCls = preview.has(key) ? ' cell--pv-ok ' : '';
              const fx = fxKeys?.has(key) ? ' animate-ping-slow ' : '';

              const base =
                'cell ' +
                (c.o ? 'obstacle ' : '') +
                (hasUnit ? 'unit ' : '') +
                (isHit ? 'hit ' : '') +
                fx +
                pvCls;

              const tipCoord = `${letters[x]}${y + 1}`;
              const title = unitTitles?.[key]
                ? `${unitTitles[key]} — (${tipCoord})`
                : `(${tipCoord})`;

              return (
                <div
                  key={key}
                  data-x={x}
                  data-y={y}
                  data-can-fire={canFire ? 'true' : 'false'}
                  className={base + (canFire ? ' cursor-pointer ' : '')}
                  title={title}
                  onMouseEnter={() => setHover({ x, y })}
                  onMouseLeave={() => setHover(undefined)}
                  onClick={() => {
                    setTarget?.({ x, y });
                    if (canFire && onFire) onFire(x, y);
                  }}
                />
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
