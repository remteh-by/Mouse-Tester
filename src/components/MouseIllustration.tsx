import { motion } from 'motion/react';

interface MouseIllustrationProps {
  buttonStates: {
    left: boolean;
    right: boolean;
    middle: boolean;
    back: boolean;
    forward: boolean;
    scrollUp: boolean;
    scrollDown: boolean;
  };
}

export default function MouseIllustration({ buttonStates }: MouseIllustrationProps) {
  // Let's draw an elegant schematic of a mouse
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700 rounded-xl shadow-xl max-w-sm w-full mx-auto">
      <div className="text-xs font-mono text-slate-400 mb-4 tracking-wider uppercase font-bold">
        Схема Кнопок (Интерактивная)
      </div>

      <div className="relative w-48 h-72">
        <svg
          viewBox="0 0 200 300"
          className="w-full h-full drop-shadow-[0_0_15px_rgba(79,70,229,0.15)]"
          style={{ overflow: 'visible' }}
        >
          {/* Main Mouse Body Outer Frame */}
          <rect
            x="30"
            y="20"
            width="140"
            height="260"
            rx="70"
            fill="#0f172a"
            stroke="#475569"
            strokeWidth="3"
          />

          {/* Mouse Grip Lines (Left & Right Cutouts) */}
          <path
            d="M 30,100 C 50,140 50,180 30,220"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
          />
          <path
            d="M 170,100 C 150,140 150,180 170,220"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Bottom palm rest detail */}
          <path
            d="M 50,230 Q 100,210 150,230"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeDasharray="4,4"
          />

          {/* Left Mouse Button Area */}
          <motion.path
            d="M 32,90 C 35,40 100,30 100,90 Z"
            fill={buttonStates.left ? '#4f46e5' : '#1e293b'}
            stroke={buttonStates.left ? '#818cf8' : '#475569'}
            strokeWidth="2"
            className="cursor-pointer transition-colors duration-75"
            animate={{
              scale: buttonStates.left ? 0.98 : 1,
              originX: 0.25,
              originY: 0.25,
            }}
          />

          {/* Right Mouse Button Area */}
          <motion.path
            d="M 100,90 C 100,30 165,40 168,90 Z"
            fill={buttonStates.right ? '#10b981' : '#1e293b'}
            stroke={buttonStates.right ? '#34d399' : '#475569'}
            strokeWidth="2"
            className="cursor-pointer transition-colors duration-75"
            animate={{
              scale: buttonStates.right ? 0.98 : 1,
              originX: 0.75,
              originY: 0.25,
            }}
          />

          {/* Separation line */}
          <line
            x1="100"
            y1="25"
            x2="100"
            y2="120"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Scroll Wheel Container */}
          <rect
            x="92"
            y="52"
            width="16"
            height="36"
            rx="8"
            fill="#090d16"
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Scroll Wheel Itself */}
          <motion.rect
            x="94"
            y="55"
            width="12"
            height="30"
            rx="6"
            fill={
              buttonStates.middle
                ? '#f59e0b'
                : buttonStates.scrollUp
                ? '#6366f1'
                : buttonStates.scrollDown
                ? '#ec4899'
                : '#475569'
            }
            stroke={
              buttonStates.middle
                ? '#fbbf24'
                : buttonStates.scrollUp
                ? '#818cf8'
                : buttonStates.scrollDown
                ? '#f472b6'
                : '#64748b'
            }
            strokeWidth="2"
            animate={{
              y: buttonStates.scrollUp ? 52 : buttonStates.scrollDown ? 58 : 55,
            }}
            transition={{ type: 'spring', damping: 10, stiffness: 300 }}
          />

          {/* Side Button 4 (Back) - Left side */}
          <motion.path
            d="M 28,140 Q 20,150 28,160 Z"
            fill={buttonStates.back ? '#6366f1' : '#1e293b'}
            stroke={buttonStates.back ? '#818cf8' : '#334155'}
            strokeWidth="1.5"
            animate={{
              x: buttonStates.back ? 1 : 0,
            }}
          />

          {/* Side Button 5 (Forward) - Left side higher */}
          <motion.path
            d="M 28,115 Q 19,125 28,135 Z"
            fill={buttonStates.forward ? '#4f46e5' : '#1e293b'}
            stroke={buttonStates.forward ? '#818cf8' : '#334155'}
            strokeWidth="1.5"
            animate={{
              x: buttonStates.forward ? 1 : 0,
            }}
          />

          {/* Text Labels inside SVG for diagnostic hints */}
          <text x="50" y="75" fill="#f8fafc" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            LMB
          </text>
          <text x="150" y="75" fill="#f8fafc" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            RMB
          </text>
          <text x="100" y="45" fill="#f8fafc" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            WHL
          </text>
          <text x="10" y="128" fill="#f8fafc" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            FWD
          </text>
          <text x="10" y="153" fill="#f8fafc" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            BCK
          </text>
        </svg>

        {/* LED RGB Strip - breathing effect representation */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
      </div>

      {/* Button State Indicators (Legend) */}
      <div className="grid grid-cols-2 gap-2 mt-4 w-full text-xs font-mono">
        <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${buttonStates.left ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full ${buttonStates.left ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
          ЛКМ (Left)
        </div>
        <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${buttonStates.right ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full ${buttonStates.right ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
          ПКМ (Right)
        </div>
        <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${buttonStates.middle ? 'bg-amber-950/40 border-amber-500/30 text-amber-400' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full ${buttonStates.middle ? 'bg-amber-400' : 'bg-slate-700'}`} />
          СКМ (Wheel)
        </div>
        <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${buttonStates.scrollUp || buttonStates.scrollDown ? 'bg-pink-950/40 border-pink-500/30 text-pink-400' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full ${buttonStates.scrollUp || buttonStates.scrollDown ? 'bg-pink-400 animate-ping' : 'bg-slate-700'}`} />
          Скролл
        </div>
      </div>
    </div>
  );
}
