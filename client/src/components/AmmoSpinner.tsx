// src/components/AmmoSpinner.tsx
import { motion, useReducedMotion } from "framer-motion";

export type Ammo = "1x1" | "1x2" | "1x3" | "2x2" | "burst" | "radar";

const ORDER: Ammo[] = ["1x1", "1x2", "1x3", "2x2", "burst", "radar"];

const AMMO_CONFIG: Record<Ammo, { label: string; color: string; icon: string }> = {
  "1x1": { label: "1×1", color: "#3b82f6", icon: "●" },
  "1x2": { label: "1×2", color: "#10b981", icon: "▬" },
  "1x3": { label: "1×3", color: "#f59e0b", icon: "≡" },
  "2x2": { label: "2×2", color: "#ef4444", icon: "⬛" },
  burst: { label: "Burst", color: "#8b5cf6", icon: "✦" },
  radar: { label: "Radar", color: "#06b6d4", icon: "◉" },
};

/** Generate clip-path for sector to contain text within slice */
function createSectorClipPath(startDeg: number, endDeg: number, radius = 48): string {
  const center = "50% 50%";
  const points = [center];
  
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const steps = 16;
  const stepSize = (endRad - startRad) / steps;
  
  for (let i = 0; i <= steps; i++) {
    const angle = startRad + i * stepSize;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  
  points.push(center);
  return `polygon(${points.join(", ")})`;
}

interface AmmoSpinnerProps {
  target: Ammo;
  onDone?: () => void;
  spins?: number;
  size?: number;
  duration?: number;
}

export default function AmmoSpinner({
  target,
  onDone,
  spins = 4,
  size = 320,
  duration = 2.2,
}: AmmoSpinnerProps) {
  const prefersReduced = useReducedMotion();
  const sliceCount = ORDER.length;
  const sliceAngle = 360 / sliceCount;
  const targetIndex = Math.max(0, ORDER.indexOf(target));
  
  // Calculate final rotation to land on target (pointing up at 12 o'clock)
  const targetAngle = targetIndex * sliceAngle + sliceAngle / 2;
  const finalRotation = (prefersReduced ? 0 : spins * 360) + (270 - targetAngle);
  
  // Responsive sizing
  const wheelSize = size;
  const labelRadius = size * 0.35;
  const fontSize = Math.max(10, size * 0.038);
  const iconSize = Math.max(14, size * 0.05);
  
  // Create gradient background
  const gradientSegments = ORDER.map((ammo, index) => {
    const startAngle = index * sliceAngle;
    const endAngle = (index + 1) * sliceAngle;
    const color = AMMO_CONFIG[ammo].color;
    return `${color} ${startAngle}deg ${endAngle}deg`;
  }).join(", ");
  
  const backgroundGradient = `conic-gradient(from 0deg, ${gradientSegments})`;

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex flex-col items-center">
        {/* Title */}
        <motion.h2 
          className="text-white text-xl font-bold mb-6 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Spinning for {AMMO_CONFIG[target].label}
        </motion.h2>

        <div className="relative" style={{ width: wheelSize, height: wheelSize + 40 }}>
          {/* Pointer/Arrow */}
          <motion.div 
            className="absolute left-1/2 -translate-x-1/2 z-30"
            style={{ top: -8 }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
          >
            <div className="relative">
              <div
                className="w-0 h-0 mx-auto"
                style={{
                  borderLeft: "12px solid transparent",
                  borderRight: "12px solid transparent",
                  borderBottom: "20px solid #fbbf24",
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
                }}
              />
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderBottom: "12px solid #f59e0b",
                }}
              />
            </div>
          </motion.div>

          {/* Spinning Wheel */}
          <motion.div
            key={target}
            className="absolute inset-x-0 top-8 mx-auto rounded-full overflow-hidden relative"
            style={{
              width: wheelSize,
              height: wheelSize,
              background: backgroundGradient,
              boxShadow: `
                0 25px 80px -20px rgba(0,0,0,0.7),
                inset 0 0 0 6px rgba(15,23,42,0.9),
                inset 0 0 80px rgba(0,0,0,0.3)
              `,
            }}
            initial={{ rotate: 0, scale: 0.8 }}
            animate={{ 
              rotate: finalRotation, 
              scale: 1 
            }}
            transition={{ 
              rotate: { 
                duration: prefersReduced ? 0 : duration, 
                ease: [0.23, 1, 0.32, 1] 
              },
              scale: {
                duration: 0.6,
                ease: "backOut"
              }
            }}
            onAnimationComplete={onDone}
          >
            {/* Slice Dividers */}
            {Array.from({ length: sliceCount }, (_, index) => (
              <div
                key={`divider-${index}`}
                className="absolute left-1/2 top-1/2 origin-bottom bg-gradient-to-t from-white/30 to-white/10"
                style={{
                  width: "2px",
                  height: "48%",
                  transform: `rotate(${index * sliceAngle}deg) translateX(-50%)`,
                }}
              />
            ))}

            {/* Center Hub */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-white/20 shadow-2xl flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-inner" />
              </motion.div>
            </div>

            {/* Ammo Labels and Icons */}
            {ORDER.map((ammo, index) => {
              const centerAngle = index * sliceAngle + sliceAngle / 2;
              const config = AMMO_CONFIG[ammo];

              return (
                <div 
                  key={`label-${ammo}`} 
                  className="absolute left-1/2 top-1/2 pointer-events-none"
                  style={{
                    transform: `rotate(${centerAngle}deg)`,
                  }}
                >
                  <div
                    className="absolute flex flex-col items-center gap-1"
                    style={{
                      top: `-${labelRadius}px`,
                      left: "50%",
                      transform: `translateX(-50%) rotate(${-centerAngle}deg)`,
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="text-white/90 font-bold leading-none"
                      style={{ 
                        fontSize: iconSize,
                        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {config.icon}
                    </div>
                    
                    {/* Label */}
                    <div
                      className="text-white font-bold text-center leading-tight whitespace-nowrap"
                      style={{
                        fontSize,
                        textShadow: "0 2px 4px rgba(0,0,0,0.9)",
                        letterSpacing: "0.5px",
                        userSelect: "none",
                      }}
                    >
                      {config.label}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Highlight ring for selected item */}
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-amber-400/40 pointer-events-none"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(251,191,36,0.3)",
                  "0 0 40px rgba(251,191,36,0.5)",
                  "0 0 20px rgba(251,191,36,0.3)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Result indicator */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-white">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: AMMO_CONFIG[target].color }}
              />
              <span className="text-sm font-medium">Target: {AMMO_CONFIG[target].label}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}