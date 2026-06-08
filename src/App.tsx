import { useState, useEffect } from 'react';
import { ClickEventLog, ScrollEventLog } from './types';
import MouseIllustration from './components/MouseIllustration';
import ClickDiagnostics from './components/ClickDiagnostics';
import ScrollDiagnostics from './components/ScrollDiagnostics';
import PollingRateDiagnostics from './components/PollingRateDiagnostics';
import SensorCanvas from './components/SensorCanvas';
import AIAdvisorPanel from './components/AIAdvisorPanel';
import { PRESET_GUIDES } from './data/guides';

import {
  Mouse,
  Sliders,
  SlidersHorizontal,
  Activity,
  PenTool,
  Bot,
  BookOpen,
  Info,
  Wrench,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'click' | 'scroll' | 'polling' | 'sensor' | 'ai' | 'handbook'>('click');

  // Shared Diagnostic Telemetry logs
  const [clickLogs, setClickLogs] = useState<ClickEventLog[]>([]);
  const [scrollLogs, setScrollLogs] = useState<ScrollEventLog[]>([]);
  const [peakPolling, setPeakPolling] = useState<number>(125);

  // Global mouse illustration highlights
  const [buttonStates, setButtonStates] = useState({
    left: false,
    right: false,
    middle: false,
    back: false,
    forward: false,
    scrollUp: false,
    scrollDown: false,
  });

  // Highlight key features when users click anywhere
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      // Left=0, Middle=1, Right=2, Back=3, Forward=4
      setButtonStates((prev) => ({
        ...prev,
        left: e.button === 0 ? true : prev.left,
        middle: e.button === 1 ? true : prev.middle,
        right: e.button === 2 ? true : prev.right,
        back: e.button === 3 ? true : prev.back,
        forward: e.button === 4 ? true : prev.forward,
      }));
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      setButtonStates((prev) => ({
        ...prev,
        left: e.button === 0 ? false : prev.left,
        middle: e.button === 1 ? false : prev.middle,
        right: e.button === 2 ? false : prev.right,
        back: e.button === 3 ? false : prev.back,
        forward: e.button === 4 ? false : prev.forward,
      }));
    };

    const handleGlobalWheel = (e: WheelEvent) => {
      const isUp = e.deltaY < 0;
      setButtonStates((prev) => ({
        ...prev,
        scrollUp: isUp,
        scrollDown: !isUp,
      }));

      const timer = setTimeout(() => {
        setButtonStates((prev) => ({
          ...prev,
          scrollUp: false,
          scrollDown: false,
        }));
      }, 150);

      return () => clearTimeout(timer);
    };

    // Right-click context menu prevention globally to enable proper Right-Click/Middle-click hold testing
    const handleContextMenu = (e: Event) => {
      // Prevent browser default context menu from stealing focus
      e.preventDefault();
    };

    window.addEventListener('mousedown', handleGlobalMouseDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('wheel', handleGlobalWheel);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Update dynamic polling calculations based on sensor logs
  useEffect(() => {
    if (activeTab === 'polling') {
      // PollingRate diagnostics will maintain hertz.
      // We will listen and capture max stats inside its frame loop.
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-indigo-500/30 selection:text-white">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-700/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-700/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Primary Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/80 border border-indigo-800/40 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)] flex items-center justify-center">
            <Mouse className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-100 uppercase">
                Mouse Diagnostics & Test Lab
              </h1>
              <span className="hidden md:inline px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-400 font-bold tracking-wider animate-pulse">
                v2.1 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Комплексный анализ кнопок, скролла, сенсора и умные ИИ-инструкции по ремонту
            </p>
          </div>
        </div>

        {/* Live system monitoring bar */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-slate-500">Драйвер:</span>
            <span className="text-slate-300 font-bold text-[11px]">Готов</span>
          </div>
          <div className="hidden xl:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">Кликов зарегистрировано:</span>
            <span className="text-indigo-400 font-bold">{clickLogs.length}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout Wrapper */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 relative z-10">
        
        {/* Left Side Static Frame - Interactive Mouse status vector schematic */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <MouseIllustration buttonStates={buttonStates} />
          
          {/* Quick calibration status card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 font-mono text-[11px]">
            <span className="font-bold text-slate-405 uppercase tracking-widest flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              Инструкция
            </span>
            <p className="text-slate-400 leading-relaxed">
              *ВНИМАНИЕ: Все клики на этой странице отображаются на векторном макете мыши выше в реальном времени. Нажмите ПКМ на холсте, чтобы протестировать свитч. Встроенное блокирование системных меню включено.
            </p>
            <div className="h-[1px] bg-slate-800 my-1" />
            <div className="space-y-1.5 text-slate-500">
              <div className="flex justify-between">
                <span>ЛКМ Дабл-клик:</span>
                <span className={clickLogs.filter(l => l.button === 'Left' && l.isDoubleClickDefect).length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {clickLogs.filter(l => l.button === 'Left' && l.isDoubleClickDefect).length > 0 ? 'Есть сбой' : 'Норма'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ПКМ Дабл-клик:</span>
                <span className={clickLogs.filter(l => l.button === 'Right' && l.isDoubleClickDefect).length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {clickLogs.filter(l => l.button === 'Right' && l.isDoubleClickDefect).length > 0 ? 'Есть сбой' : 'Норма'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Сбои скролла:</span>
                <span className={scrollLogs.filter(s => s.isJitter).length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {scrollLogs.filter(s => s.isJitter).length > 0 ? 'Обнаружены' : 'Нет'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Frame - Interactive diagnostic test benches */}
        <div className="xl:col-span-3 flex flex-col gap-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl">
          
          {/* Sub Navigation Bar / Tabs */}
          <nav className="flex items-center gap-1.5 border-b border-slate-800/80 pb-4 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('click')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide cursor-pointer transition-all ${
                activeTab === 'click'
                  ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Тест Кликов</span>
            </button>

            <button
              onClick={() => setActiveTab('scroll')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide cursor-pointer transition-all ${
                activeTab === 'scroll'
                  ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Тест Колесика</span>
            </button>

            <button
              onClick={() => setActiveTab('polling')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide cursor-pointer transition-all ${
                activeTab === 'polling'
                  ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>Частота Опроса</span>
            </button>

            <button
              onClick={() => setActiveTab('sensor')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide cursor-pointer transition-all ${
                activeTab === 'sensor'
                  ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'
              }`}
            >
              <PenTool className="w-4 h-4 shrink-0" />
              <span>Тест Сенсора</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide cursor-pointer transition-all ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b-2 border-indigo-550 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              <span className="flex items-center gap-1">ИИ Ремонтник <span className="w-2 h-2 bg-indigo-400 rounded-full animate-ping shrink-0" /></span>
            </button>

            <button
              onClick={() => setActiveTab('handbook')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide cursor-pointer transition-all ${
                activeTab === 'handbook'
                  ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b-2 border-indigo-500 text-indigo-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Инструкции</span>
            </button>
          </nav>

          {/* Active Panel Frame container */}
          <div className="flex-1 min-h-[350px]">
            {activeTab === 'click' && (
              <ClickDiagnostics
                onLogClick={(btn, code) => {
                  // Capture clicks internally
                }}
                clickLogs={clickLogs}
                setClickLogs={setClickLogs}
              />
            )}

            {activeTab === 'scroll' && (
              <ScrollDiagnostics
                onScrollAction={(dir) => {
                  // Captured internally
                }}
                scrollLogs={scrollLogs}
                setScrollLogs={setScrollLogs}
              />
            )}

            {activeTab === 'polling' && (
              <PollingRateDiagnostics />
            )}

            {activeTab === 'sensor' && (
              <SensorCanvas />
            )}

            {activeTab === 'ai' && (
              <AIAdvisorPanel
                clickLogs={clickLogs}
                scrollLogs={scrollLogs}
                peakPollingRate={peakPolling}
              />
            )}

            {activeTab === 'handbook' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                  <Wrench className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold tracking-tight text-slate-200 uppercase">
                    Инструкции по разбору и ремонту кнопок и скролла
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRESET_GUIDES.map((guide) => (
                    <div
                      key={guide.id}
                      className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 hover:bg-slate-950/90 transition-colors duration-250 group/card"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2 header-tag">
                          <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/20">
                            Сложность: {guide.difficulty}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {guide.id}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-250 group-hover/card:text-indigo-300 transition-colors mb-1">
                          {guide.title}
                        </h4>
                        <p className="text-[11px] text-rose-350 font-mono mb-3 leading-relaxed bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                          Симптом: {guide.symptom}
                        </p>

                        <div className="space-y-1 mb-4 text-[11px] text-slate-400">
                          <strong className="text-slate-500 text-[10px] block uppercase tracking-wider mb-1">Инструменты:</strong>
                          <div className="flex flex-wrap gap-1">
                            {guide.toolsRequired.map((tool, tIdx) => (
                              <span key={tIdx} className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 text-[11px] border-t border-slate-900 pt-3">
                          <strong className="text-slate-500 text-[10px] block uppercase tracking-wider mb-1">Шаги починки:</strong>
                          {guide.steps.slice(0, 4).map((step, sIdx) => (
                            <div key={sIdx} className="flex gap-1.5 leading-relaxed text-slate-400">
                              <span className="text-indigo-400 font-bold">{sIdx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                          {guide.steps.length > 4 && (
                            <p className="text-[10px] font-mono text-slate-600 italic">
                              и еще {guide.steps.length - 4} шагов... Откройте ИИ-Консультанта для полной статьи
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Laboratory general Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-4 mt-12 text-center text-[11px] font-mono text-slate-600 flex flex-col md:flex-row items-center justify-between gap-2 relative z-10">
        <div>
          <span>© 2026 Mouse Diagnostics Lab (Диагностическая Лаборатория Мышек).</span>
        </div>
        <div className="flex gap-4">
          <span>Разработано для OTG Подключений & ПК Сенсоров</span>
          <span>•</span>
          <span className="text-indigo-400 font-bold">UTC: 2026-06-08</span>
        </div>
      </footer>
    </div>
  );
}
