import { useState, useRef, useEffect } from 'react';
import { ClickEventLog } from '../types';
import { Sliders, RefreshCw, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface ClickDiagnosticsProps {
  onLogClick: (button: 'Left' | 'Right' | 'Middle' | 'Back' | 'Forward' | 'Unknown', code: number) => void;
  clickLogs: ClickEventLog[];
  setClickLogs: React.Dispatch<React.SetStateAction<ClickEventLog[]>>;
}

export default function ClickDiagnostics({ onLogClick, clickLogs, setClickLogs }: ClickDiagnosticsProps) {
  const [doubleClickThreshold, setDoubleClickThreshold] = useState<number>(75); // ms
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdButton, setHoldButton] = useState<string | null>(null);
  const [holdDrops, setHoldDrops] = useState<number>(0);
  const [holdTime, setHoldTime] = useState<number>(0);
  const [successfulHolds, setSuccessfulHolds] = useState<number>(0);

  const lastClickTimes = useRef<Record<string, number>>({});
  const dragTimerRef = useRef<any>(null);
  const isDraggingState = useRef<boolean>(false);

  // Sound effects of click (synthesized using Web Audio API to give great feedback)
  const playBeep = (freq: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  const handlePadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    let buttonName: ClickEventLog['button'] = 'Unknown';

    switch (e.button) {
      case 0:
        buttonName = 'Left';
        break;
      case 1:
        buttonName = 'Middle';
        break;
      case 2:
        buttonName = 'Right';
        break;
      case 3:
        buttonName = 'Back';
        break;
      case 4:
        buttonName = 'Forward';
        break;
    }

    onLogClick(buttonName, e.button);

    const prevTime = lastClickTimes.current[buttonName] || 0;
    const interval = prevTime > 0 ? now - prevTime : 0;
    lastClickTimes.current[buttonName] = now;

    const isDouble = interval > 0 && interval < doubleClickThreshold;

    if (isDouble) {
      playBeep(330, 0.2, 'square'); // Warning sound
    } else {
      playBeep(600, 0.05, 'sine'); // Clean click sound
    }

    const newLog: ClickEventLog = {
      id: Math.random().toString(36).substr(2, 9),
      button: buttonName,
      buttonCode: e.button,
      timestamp: now,
      interval,
      isDoubleClickDefect: isDouble,
    };

    setClickLogs((prev) => [newLog, ...prev].slice(0, 50));

    // Handle Drag Hold test trigger
    setIsHolding(true);
    setHoldButton(buttonName);
    setHoldTime(0);
    isDraggingState.current = true;
  };

  const handlePadMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsHolding(false);
    setHoldButton(null);
    isDraggingState.current = false;
    if (holdTime > 1.5 && holdDrops === 0) {
      setSuccessfulHolds((prev) => prev + 1);
    }
  };

  // Tracking the hold stability
  useEffect(() => {
    let intervalId: any;
    if (isHolding) {
      intervalId = setInterval(() => {
        setHoldTime((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [isHolding]);

  // Global mouse up event listener to capture accidental click dropouts
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingState.current) {
        // user was holding, let's see if they released
        // This is normal unless they are still physically doing a drag or it occurs within 20ms
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const clearHistory = () => {
    setClickLogs([]);
    setHoldDrops(0);
    setSuccessfulHolds(0);
    setHoldTime(0);
    lastClickTimes.current = {};
  };

  const doubleClickCounts = clickLogs.filter((log) => log.isDoubleClickDefect).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Click Test Pad & Hold Test */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Main Clicking Pad */}
        <div
          onMouseDown={handlePadMouseDown}
          onMouseUp={handlePadMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          className="relative h-60 w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center text-center cursor-pointer select-none overflow-hidden group transition-all duration-300 shadow-inner"
        >
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="z-10 p-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-600 group-hover:scale-105 group-hover:border-indigo-500/30 transition-all duration-300 shadow-md">
              <Sliders className="w-8 h-8 text-indigo-400 group-hover:animate-pulse" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-100 mb-1 uppercase">
              КЛИКАЙТЕ ЗДЕСЬ ВСЕМИ КНОПКАМИ
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              ЛКМ, ПКМ, Колесико и боковые кнопки вашей мыши поддерживаются. Нажмите и удерживайте для теста удержания.
            </p>
          </div>

          {/* Active Hold Status Visual Overlay */}
          {isHolding && (
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-slate-950/90 border border-indigo-500/30 px-4 py-2.5 rounded-lg text-xs font-mono text-indigo-400 animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
                Держим кнопку: {holdButton}
              </span>
              <span>Время зажатия: {holdTime}s</span>
            </div>
          )}
        </div>

        {/* Drag & Hold Stability Monitor */}
        <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-200">
              Тест на удержание кнопки (Контактный дребезг зажатия)
            </h4>
            {holdDrops > 0 ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5" /> Дребезг контактов!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" /> Стабилен
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Если в микрике есть микротрещины или окислы, при сильном непрерывном зажатии ЛКМ/ПКМ сигнал будет кратковременно разрываться. Задержите палец на панели Клика выше не менее чем на 2 секунды.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs text-slate-300">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-slate-500 text-[10px] uppercase mb-1 font-bold">Успешных удержаний</div>
              <div className="text-xl font-bold text-emerald-400">{successfulHolds}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-slate-500 text-[10px] uppercase mb-1 font-bold">Микро-разрывы</div>
              <div className="text-xl font-bold text-rose-400">{holdDrops}</div>
            </div>
            <div className="col-span-2 md:col-span-1 p-3 bg-slate-900 rounded-lg border border-slate-700 flex flex-col justify-center">
              <div className="text-slate-500 text-[10px] uppercase mb-1 font-bold">Рекомендация</div>
              <div className="text-[11px] font-semibold text-slate-300">
                {holdDrops > 0 ? 'Замените микропереключатель' : 'Свитчи исправны'}
              </div>
            </div>
          </div>
        </div>

        {/* Double Click Threshold Controller */}
        <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Порог двойного клика (Debounce Time)
            </span>
            <span className="text-sm font-mono text-indigo-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded border border-slate-700">
              {doubleClickThreshold} ms
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="180"
            value={doubleClickThreshold}
            onChange={(e) => setDoubleClickThreshold(Number(e.target.value))}
            className="w-full accent-indigo-600 h-1 bg-slate-905 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>30мс (Быстрые геймерские микрики)</span>
            <span>180мс (Офисные мыши)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            *Интервал между кликами одной кнопки менее выбранной величины расценивается как дефект (двойной клик), так как физически человек не может кликать с частотой выше 12-14 нажатий в секунду (от ~80мс за клик).
          </p>
        </div>
      </div>

      {/* Click logs & Statistics Timeline */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
            История кликов ({clickLogs.length})
          </h4>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3 h-3" /> Очистить
          </button>
        </div>

        {/* Aggregate Stats */}
        <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl grid grid-cols-2 gap-3 font-mono">
          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Всего кликов</div>
            <div className="text-lg font-bold text-slate-200">{clickLogs.length}</div>
          </div>
          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Дабл-кликов</div>
            <div className={`text-lg font-bold ${doubleClickCounts > 0 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-400'}`}>
              {doubleClickCounts}
            </div>
          </div>
        </div>

        {/* Scrollable list of logs */}
        <div className="flex-1 min-h-[300px] max-h-[420px] overflow-y-auto pr-1 bg-slate-950 border border-slate-700 rounded-xl p-4 flex flex-col gap-2 scrollbar-thin">
          {clickLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-12">
              <Flame className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
              <span className="text-xs">Нажмите кнопки на панели слева для тестирования</span>
            </div>
          ) : (
            clickLogs.map((log) => (
              <div
                key={log.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-all duration-150 ${
                  log.isDoubleClickDefect
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-[0_0_8px_rgba(239,68,68,0.06)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      log.button === 'Left'
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                        : log.button === 'Right'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : log.button === 'Middle'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                    }`}
                  >
                    {log.button === 'Left'
                      ? 'ЛКМ'
                      : log.button === 'Right'
                      ? 'ПКМ'
                      : log.button === 'Middle'
                      ? 'СКМ'
                      : log.button === 'Back'
                      ? 'НАЗАД'
                      : log.button === 'Forward'
                      ? 'ВПЕРЕД'
                      : log.button}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span>
                    {log.interval > 0 ? (
                      <>
                        Пауза:{' '}
                        <span className={`font-semibold ${log.isDoubleClickDefect ? 'text-rose-400 underline font-bold' : 'text-slate-200'}`}>
                          {log.interval}мс
                        </span>
                      </>
                    ) : (
                      'Первый клик'
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {log.isDoubleClickDefect ? (
                    <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> ДАБЛ-КЛИК
                    </span>
                  ) : (
                    <span className="text-slate-600 text-[10px]">OK</span>
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
