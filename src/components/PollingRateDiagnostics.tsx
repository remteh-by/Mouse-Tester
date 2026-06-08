import { useState, useRef, useEffect } from 'react';
import { PollingStats } from '../types';
import { Activity, RefreshCw, AlertCircle, Zap } from 'lucide-react';

export default function PollingRateDiagnostics() {
  const [currentHz, setCurrentHz] = useState<number>(0);
  const [stats, setStats] = useState<PollingStats>({
    hz: 0,
    avgHz: 0,
    maxHz: 0,
    minDelay: 9999,
    maxDelay: 0,
    delayHistory: [],
  });

  const moveTimes = useRef<number[]>([]);
  const lastMoveTime = useRef<number>(0);
  const hzSamples = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Sound generator for high polling rate activity (subtle tick)
  const lastTickTime = useRef<number>(0);
  const playTick = () => {
    const rawNow = Date.now();
    if (rawNow - lastTickTime.current > 150) { // Throttle tick sounds
      lastTickTime.current = rawNow;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.003, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.01);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.01);
      } catch (e) {}
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const now = performance.now();
    
    // Calculate interval delay
    if (lastMoveTime.current > 0) {
      const delay = now - lastMoveTime.current;
      if (delay > 0.5 && delay < 100) { // filter out pauses/focus drops
        setStats((prev) => {
          const nextHistory = [delay, ...prev.delayHistory].slice(0, 30);
          return {
            ...prev,
            minDelay: Math.min(prev.minDelay, +delay.toFixed(1)),
            maxDelay: Math.max(prev.maxDelay, +delay.toFixed(1)),
            delayHistory: nextHistory,
          };
        });
      }
    }
    lastMoveTime.current = now;

    // Save timestamp for Hz calculation
    moveTimes.current.push(now);
    playTick();
  };

  // Periodic update loops
  useEffect(() => {
    const updateStats = () => {
      const now = performance.now();
      const halfSecondAgo = now - 500; // Count events in last 500ms and multiply by 2 for Hz
      
      // Filter out timestamps older than 500ms
      moveTimes.current = moveTimes.current.filter((t) => t > halfSecondAgo);
      
      const calcHz = moveTimes.current.length * 2;
      setCurrentHz(calcHz);

      if (calcHz > 10) {
        hzSamples.current.push(calcHz);
        if (hzSamples.current.length > 50) hzSamples.current.shift();

        const sum = hzSamples.current.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / hzSamples.current.length);

        setStats((prev) => ({
          ...prev,
          hz: calcHz,
          avgHz: avg,
          maxHz: Math.max(prev.maxHz, calcHz),
        }));
      } else {
        // Drop current Hz to 0 if no mouse movement
        setStats((prev) => ({ ...prev, hz: 0 }));
      }

      animationFrameRef.current = requestAnimationFrame(updateStats);
    };

    animationFrameRef.current = requestAnimationFrame(updateStats);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const resetPollingStats = () => {
    moveTimes.current = [];
    hzSamples.current = [];
    lastMoveTime.current = 0;
    setStats({
      hz: 0,
      avgHz: 0,
      maxHz: 0,
      minDelay: 9999,
      maxDelay: 0,
      delayHistory: [],
    });
    setCurrentHz(0);
  };

  // Human-readable quality standard
  const getHzQuality = (hz: number) => {
    if (hz === 0) return { text: 'Ожидание движения', color: 'text-slate-500 bg-slate-950/40 border-slate-700' };
    if (hz < 100) return { text: 'Уверенное движение / Медленный скролл', color: 'text-sky-400 bg-sky-950/20 border-sky-750/40' };
    if (hz < 150) return { text: 'Офисный стандарт (125 Гц)', color: 'text-teal-400 bg-teal-950/20 border-teal-750/40' };
    if (hz < 300) return { text: 'Улучшенная частота (250 Гц)', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-750/40' };
    if (hz < 600) return { text: 'Игровой режим (500 Гц)', color: 'text-amber-400 bg-amber-950/20 border-amber-750/40' };
    return { text: 'Высокоскоростная игровая (1000 Гц+)', color: 'text-rose-400 bg-rose-950/20 border-rose-700 font-bold' };
  };

  const rating = getHzQuality(stats.avgHz);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Dynamic movement target board */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div
          onMouseMove={handleMouseMove}
          className="relative h-64 w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center text-center overflow-hidden group select-none cursor-crosshair shadow-inner"
        >
          {/* Neon scan lines to imply laser sensor diagnostics */}
          <div className="absolute inset-x-0 h-[1px] bg-indigo-500/10 animate-pulse top-1/4" />
          <div className="absolute inset-x-0 h-[1px] bg-indigo-500/10 animate-pulse top-2/3" />
          <div className="absolute inset-y-0 w-[1px] bg-indigo-500/10 animate-pulse left-1/3" />
          <div className="absolute inset-y-0 w-[1px] bg-indigo-500/10 animate-pulse left-2/3" />

          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="z-10 p-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-600 group-hover:scale-105 group-hover:border-indigo-500/30 transition-all duration-300 shadow-md">
              <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-100 mb-1 uppercase">
              ДВИГАЙТЕ МЫШЬЮ НАД ЭТОЙ ПАНЕЛЬЮ
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Делайте непрерывные круговые движения. Чем интенсивнее движение, тем точнее расчет частоты опроса.
            </p>
          </div>

          {/* Real-time floating coordinate dots layout */}
          {currentHz > 10 && (
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] font-mono text-indigo-400 font-bold bg-slate-950/90 px-3 py-1.5 rounded-lg border border-slate-705">
              <span>Динамический расчёт: {currentHz} Гц</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            </div>
          )}
        </div>

        {/* Polling Rate Standards info */}
        <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Стандарты отклика (Hertz)
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Частота опроса (Hertz) показывает, сколько раз в секунду мышь отправляет координаты компьютеру. На игровых ПК стандартные частоты составляют 500 Гц (задержка 2мс) и 1000 Гц (задержка 1мс). Базовая офисная частота — 125 Гц (задержка 8мс).
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-700">
              <span className="text-slate-400">125 Гц (Офисный стандарт)</span>
              <span className="text-slate-300">8.0 ms интервал</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-700">
              <span className="text-slate-400">500 Гц (Игровой стандарт)</span>
              <span className="text-slate-300">2.0 ms интервал</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-700">
              <span className="text-slate-400">1000 Гц (Про-гейминг)</span>
              <span className="text-slate-300">1.0 ms интервал</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hertz Stats Dashboard & Real-time Graph delay */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
            Спецификация Частоты
          </h4>
          <button
            onClick={resetPollingStats}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3 h-3" /> Сброс
          </button>
        </div>

        {/* Live Quality Badge */}
        <div className={`p-4 rounded-xl border text-center text-xs font-mono transition-all duration-300 ${rating.color.replace('border-sky-800/40', 'border-sky-700').replace('border-teal-800/40', 'border-teal-700').replace('border-emerald-800/40', 'border-emerald-700').replace('border-amber-800/40', 'border-amber-700').replace('border-rose-800/40', 'border-rose-700')}`}>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
            Рейтинг Сенсора / Софта
          </div>
          <div className="text-sm font-bold flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-400" />
            {rating.text}
          </div>
        </div>

        {/* Polling Stats Grid */}
        <div className="grid grid-cols-2 gap-3 font-mono text-center">
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Текущая Частота</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{stats.hz} <span className="text-xs">Гц</span></div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Пиковая Частота</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.maxHz} <span className="text-xs">Гц</span></div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Миним. Задержка</div>
            <div className="text-lg font-bold text-slate-300 mt-1">
              {stats.minDelay === 9999 ? '---' : `${stats.minDelay} ms`}
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl animate-pulse">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Макс. Задержка</div>
            <div className="text-lg font-bold text-rose-400 mt-1">
              {stats.maxDelay === 0 ? '---' : `${stats.maxDelay} ms`}
            </div>
          </div>
        </div>

        {/* Visualizer delay ticks */}
        <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl flex-1 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2 font-bold">
            Пинг задержки отправки координат (последние 30 пакетов)
          </span>

          <div className="h-28 flex items-end justify-between gap-[2px] bg-slate-900 border border-slate-850 p-2 rounded-lg overflow-hidden">
            {stats.delayHistory.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-slate-650 text-xs font-mono">
                Нет логов (двигайте мышь)
              </div>
            ) : (
              // Display delay spikes representation
              [...stats.delayHistory].reverse().map((delay, idx) => {
                const heightPercent = Math.min((delay / 16) * 100, 100);
                let barColor = 'bg-indigo-500';
                if (delay > 8) barColor = 'bg-amber-500';
                if (delay > 14) barColor = 'bg-rose-500 animate-pulse';

                return (
                   <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative">
                    <div
                      style={{ height: `${heightPercent || 4}%` }}
                      className={`w-full ${barColor} rounded-t transition-all duration-300`}
                    />
                    {/* Tooltip on hover */}
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-950 border border-slate-700 text-slate-200 px-1 py-0.5 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 font-bold mb-1 shadow">
                      {delay}ms
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
            <span>Меньше секунд (стабильно 1ms)</span>
            <span>Выше 8ms (Просадки/Энергосберег)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
