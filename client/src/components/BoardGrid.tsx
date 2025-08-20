import { useMemo, useState } from 'react';
import type { Board, Dir } from '../types';

type Point = { x: number; y: number };

const letters = 'ABCDEFGHIJKL'.split('');

function inBounds(x: number, y: number) {
  return x >= 0 && y >= 0 && x < 12 && y < 12;
}

function shapeCells(x: number, y: number, dir: Dir, ammo?: string): Point[] {
  if (!ammo) return [];
  const d: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const [dx, dy] = d[dir];
  const cells: Point[] = [];
  const hit = (ix: number, iy: number) => {
    if (inBounds(ix, iy)) cells.push({ x: ix, y: iy });
  };

  switch (ammo) {
    case '1x1':
      hit(x, y);
      break;
    case '1x2':
      hit(x, y);
      hit(x + dx, y + dy);
      break;
    case '1x3':
      hit(x, y);
      hit(x + dx, y + dy);
      hit(x + 2 * dx, y + 2 * dy);
      break;
    case '2x2':
      hit(x, y);
      hit(x + 1, y);
      hit(x, y + 1);
      hit(x + 1, y + 1);
      break;
    case 'burst':
      // burst là ngẫu nhiên ở server; preview chỉ gợi ý vùng quanh tâm
      hit(x, y);
      hit(x + dx, y + dy);
      hit(x - dx, y - dy);
      break;
    case 'radar':
      hit(x, y);
      for (let i = -2; i <= 2; i++) {
        if (dir === 'E' || dir === 'W') hit(x + i, y);
        else hit(x, y + i);
      }
      break;
  }
  return cells;
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

  const preview = useMemo(() => {
    const src = hover ?? target;
    if (!src) return new Set<string>();
    return new Set(shapeCells(src.x, src.y, dir, ammo).map((p) => `${p.x},${p.y}`));
  }, [hover, target, dir, ammo]);

  return (
    <div className="inline-block">
      {/* Nhãn cột */}
      <div className="ml-7 grid grid-cols-12 gap-1 mb-1 select-none text-xs opacity-70">
        {letters.map((c) => (
          <div key={c} className="w-7 text-center">
            {c}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {/* Nhãn hàng */}
        <div className="mr-1 grid grid-rows-12 gap-1 select-none text-xs opacity-70">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-7 w-6 text-right pr-1 leading-7">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Lưới 12x12 */}
        <div className="grid grid-cols-12 gap-1">
          {board.flatMap((row, y) =>
            row.map((c, x) => {
              const key = `${x},${y}`;
              const isHit = !!c.h;
              const hasUnit = showUnits && !!c.u;
              const aimed = preview.has(key)
                ? ' ring-2 ring-amber-400/70 ring-offset-1 ring-offset-slate-900 '
                : '';
              const fx = fxKeys?.has(key) ? ' animate-ping-slow ' : '';

              const base =
                'cell transition-colors duration-100 ' +
                'hover:border-sky-400/70 hover:shadow ' +
                (c.o ? 'obstacle ' : '') +
                (hasUnit ? 'unit ' : '') +
                (isHit ? 'hit ' : '') +
                fx;

              const tipCoord = `${letters[x]}${y + 1}`;
              const title = unitTitles?.[key]
                ? `${unitTitles[key]} — (${tipCoord})`
                : `(${tipCoord})`;

              return (
                <div
                  key={key}
                  data-x={x}
                  data-y={y}
                  className={base + aimed + (canFire ? ' cursor-pointer ' : '')}
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
          <Legend sw="ring-amber-400/70 ring-2" label="Vùng bắn dự kiến" />
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
