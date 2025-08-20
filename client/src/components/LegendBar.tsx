
export default function LegendBar() {
  const Chip = ({ color, text, ring }: { color: string; text: string; ring?: boolean }) => (
    <span className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 mr-2 mb-2">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ background: color, boxShadow: ring ? '0 0 0 2px #f59e0b' : undefined }}
      />
      {text}
    </span>
  );

  return (
    <div className="mb-3">
      <Chip color="#10b981" text="Ô xanh lá: đơn vị của bạn" />
      <Chip color="#ef4444" text="Ô đỏ: đã trúng" />
      <Chip color="#0ea5e9" text="Viền xanh: ô trượt (nếu có)" />
      <Chip color="transparent" ring text="Viền vàng: vùng bắn dự kiến" />
    </div>
  );
}
