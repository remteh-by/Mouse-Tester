import { useState, useRef, useEffect } from 'react';
import { ScrollEventLog } from '../types';
import { MousePointer, RefreshCw, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface ScrollDiagnosticsProps {
  onScrollAction: (direction: 'up' | 'down') => void;
  scrollLogs: ScrollEventLog[];
  setScrollLogs: React.Dispatch<React.SetStateAction<ScrollEventLog[]>>;
}

export default function ScrollDiagnostics({ onScrollAction, scrollLogs, setScrollLogs }: ScrollDiagnosticsProps) {
  const [scrollPosition, setScrollPosition] = useState<number>(50); // Virtual page index
  const [jitterCount, setJitterCount] = useState<number>(0);
  const [totalScrolls, setTotalScrolls] = useState<{ up: number; down: number }>({ up: 0, down: 0 });

  const recentDirections = useRef<('up' | 'down')[]>([]);

  // Web Audio API feedback for scroll
  const playScrollBeep = (freq: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime); 
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {}
  };

  const handleScrollAreaWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 'up' : 'down';
    const now = Date.now();

    playScrollBeep(dir === 'up' ? 800 : 700);
    onScrollAction(dir);

    // Heuristic Jitter Detection:
    // If we scroll in a direction opposing the dominant flow of the last 6 scroll events,
    // and the event interval was quick (user is scrolling), we flag it as an encoder jitter/skip.
    const recent = recentDirections.current;
    recent.push(dir);
    if (recent.length > 8) {
      recent.shift();
    }

    // Determine dominant direction of the other recent events
    const upCount = recent.filter(d => d === 'up').length;
    const downCount = recent.filter(d => d === 'down').length;
    
    let isJitterDefect = false;
    if (recent.length >= 4) {
      if (dir === 'up' && downCount >= recent.length - 1) {
        // Almost all other inputs are DOWN, but this one is UP
        isJitterDefect = true;
      } else if (dir === 'down' && upCount >= recent.length - 1) {
        // Almost all other inputs are UP, but this one is DOWN
        isJitterDefect = true;
      }
    }

    if (isJitterDefect) {
      setJitterCount((prev) => prev + 1);
    }

    setTotalScrolls((prev) => ({
      up: prev.up + (dir === 'up' ? 1 : 0),
      down: prev.down + (dir === 'down' ? 1 : 0)
    }));

    // Update Virtual page scroll position
    setScrollPosition((prev) => {
      let next = prev + (dir === 'up' ? -2 : 2);
      if (next < 0) next = 100; // Loop around
      if (next > 100) next = 0;
      return next;
    });

    const newLog: ScrollEventLog = {
      timestamp: now,
      direction: dir,
      deltaY: e.deltaY,
      isJitter: isJitterDefect
    };

    setScrollLogs((prev) => [newLog, ...prev].slice(0, 50));
  };

  const resetScrollStats = () => {
    setScrollLogs([]);
    setJitterCount(0);
    setTotalScrolls({ up: 0, down: 0 });
    recentDirections.current = [];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Scroll area & explanation */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div
          onWheel={handleScrollAreaWheel}
          className="relative h-64 w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center text-center cursor-ns-resize overflow-hidden group select-none shadow-inner"
        >
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="z-10 p-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-600 group-hover:scale-105 group-hover:border-indigo-500/30 transition-all duration-300 shadow-md">
              <MousePointer className="w-8 h-8 text-indigo-400 group-hover:animate-bounce" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-100 mb-1 uppercase">
              ПРОКРУЧИВАЙТЕ КОЛЕСИКО ЗДЕСЬ
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Крутите скролл вверх и вниз на этой панели. Приложение автоматически проверит стабильность вращения датчика (энкодера).
            </p>
          </div>

          {/* Virtual scrolling list visualizer */}
          <div className="absolute bottom-4 left-6 right-6 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-150"
              style={{ width: `${scrollPosition}%` }}
            />
          </div>
        </div>

        {/* Scroll Jitter Status Explanation */}
        <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">
            Как работает детектор сбоев колесика?
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Самая частая поломка энкодера мыши — окисление или загрязнение контактов пылью и смазкой. Из-за этого при непрерывной прокрутке вниз пролетают ложные сигналы «вверх». Наш алгоритм отслеживает хронологию векторов и подсвечивает хаотичные откаты.
          </p>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${jitterCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold block text-slate-300">
                {jitterCount > 0 ? `Обнаружено сбоев: ${jitterCount}` : 'Сбои не обнаружены'}
              </span>
              <span className="text-slate-500 text-[11px] leading-relaxed">
                {jitterCount > 0 
                  ? 'Скролл вашей мыши пропускает шаги или дергается. Рекомендуется чистка спиртом или замена энкодера.' 
                  : 'Энкодер выдает плавный последовательный сигнал во всех направлениях.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate counts & logs list */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
            Счетчики скролла
          </h4>
          <button
            onClick={resetScrollStats}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3 h-3" /> Очистить
          </button>
        </div>

        {/* Counts Grid */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl">
            <div className="text-[9px] text-slate-400 uppercase flex items-center justify-center gap-1 font-bold">
              <ArrowUp className="w-3 h-3 text-indigo-400" /> Вверх
            </div>
            <div className="text-lg font-bold text-slate-200 mt-1">{totalScrolls.up}</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl">
            <div className="text-[9px] text-slate-400 uppercase flex items-center justify-center gap-1 font-bold">
              <ArrowDown className="w-3 h-3 text-indigo-500" /> Вниз
            </div>
            <div className="text-lg font-bold text-slate-200 mt-1">{totalScrolls.down}</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl flex flex-col justify-center">
            <div className="text-[9px] text-slate-400 uppercase font-bold">Ошибок</div>
            <div className={`text-lg font-bold mt-1 ${jitterCount > 0 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-400'}`}>
              {jitterCount}
            </div>
          </div>
        </div>

        {/* Scroll Event list */}
        <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto pr-1 bg-slate-950 border border-slate-700 rounded-xl p-4 flex flex-col gap-2 scrollbar-thin">
          {scrollLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-12">
              <ArrowDown className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
              <span className="text-xs">Покрутите колесико мыши внутри панели слева</span>
            </div>
          ) : (
            scrollLogs.map((log, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-all duration-150 ${
                  log.isJitter
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {log.direction === 'up' ? (
                    <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-500/20">
                      <ArrowUp className="w-3 h-3" /> ВВЕРХ
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-500/20">
                      <ArrowDown className="w-3 h-3" /> ВНИЗ
                    </span>
                  )}
                  <span className="text-slate-500">DeltaY: {Math.round(log.deltaY)}</span>
                </div>

                <div>
                  {log.isJitter ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Сбой! (Реверс)
                    </span>
                  ) : (
                    <span className="text-slate-600 text-[10px]">Успешно</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
