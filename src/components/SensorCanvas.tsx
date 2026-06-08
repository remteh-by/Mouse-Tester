import { useState, useRef, useEffect } from 'react';
import { Eraser, Trash2, Sliders, CheckSquare, Eye, Gauge } from 'lucide-react';

export default function SensorCanvas() {
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [gridTemplate, setGridTemplate] = useState<'none' | 'spiral' | 'precision-dots' | 'curves'>('none');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStats, setDrawStats] = useState({ totalPixels: 0, maxSpeed: 0, avSpeed: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCoordinates = useRef<{ x: number; y: number; time: number } | null>(null);
  const speedSamples = useRef<number[]>([]);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adjust for HighDPI / Retina screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    clearCanvas();
  }, [gridTemplate]);

  // Redraw Grid Template when selected
  const drawGridStyle = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    
    if (gridTemplate === 'spiral') {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let cx = width / 2;
      let cy = height / 2;
      let r = 8;
      ctx.moveTo(cx, cy);
      for (let i = 0; i < 350; i++) {
        let angle = 0.1 * i;
        let x = cx + (r + 1.2 * i) * Math.cos(angle);
        let y = cy + (r + 1.2 * i) * Math.sin(angle);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (gridTemplate === 'precision-dots') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      for (let x = 30; x < width; x += 40) {
        for (let y = 30; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridTemplate === 'curves') {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 40; y < height; y += 80) {
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(width / 3, y - 60, (2 * width) / 3, y + 60, width, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const getVelocityColor = (speed: number) => {
    // Maps speed (0 - 1500) to colors (Green -> Teal -> Yellow -> Red)
    const factor = Math.min(speed / 1200, 1);
    const r = Math.round(factor * 255);
    const g = Math.round((1 - factor) * 180 + factor * 50);
    const b = Math.round((1 - factor) * 100 + factor * 50);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Apply template structure
    drawGridStyle(ctx, w, h);

    setDrawStats({ totalPixels: 0, maxSpeed: 0, avSpeed: 0 });
    speedSamples.current = [];
    lastCoordinates.current = null;
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click drawing
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    
    lastCoordinates.current = {
      x: coords.x,
      y: coords.y,
      time: performance.now(),
    };
  };

  const drawAction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctxRef.current) return;
    const coords = getCanvasCoords(e);
    const now = performance.now();
    const last = lastCoordinates.current;

    if (last) {
      const dx = coords.x - last.x;
      const dy = coords.y - last.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const dt = now - last.time;

      // Speed in pixels per second
      const speed = dt > 0 ? (distance / dt) * 1000 : 0;

      // Filter out huge lag spikes
      if (speed < 6000 && distance > 0.5) {
        speedSamples.current.push(speed);
        if (speedSamples.current.length > 200) speedSamples.current.shift();

        const avg = Math.round(speedSamples.current.reduce((a, b) => a + b, 0) / speedSamples.current.length);

        setDrawStats((prev) => ({
          totalPixels: prev.totalPixels + Math.round(distance),
          maxSpeed: Math.round(Math.max(prev.maxSpeed, speed)),
          avSpeed: avg,
        }));

        // Draw Line with velocity responsive color
        const ctx = ctxRef.current;
        ctx.beginPath();
        ctx.strokeStyle = getVelocityColor(speed);
        ctx.lineWidth = lineWidth;
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }

    lastCoordinates.current = {
      x: coords.x,
      y: coords.y,
      time: now,
    };
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastCoordinates.current = null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Interactive board */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="p-3.5 bg-slate-900 border border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-slate-400">
              <Sliders className="w-4 h-4 text-indigo-400" /> Настройки холста:
            </span>

            {/* Brush Size */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700/80">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Толщина</span>
              <input
                type="range"
                min="1"
                max="12"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-16 accent-indigo-600 cursor-pointer"
              />
              <span className="w-4 text-right text-indigo-450 font-bold">{lineWidth}px</span>
            </div>

            {/* Grid selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-700/80 text-[11px]">
              <span className="text-slate-500 uppercase text-[10px] font-bold">Трафарет:</span>
              <select
                value={gridTemplate}
                onChange={(e: any) => setGridTemplate(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer focus:text-indigo-400 pr-1 py-1 font-bold"
              >
                <option value="none">Пустой</option>
                <option value="spiral">Спираль (Плавность)</option>
                <option value="curves">Волны (Траектория)</option>
                <option value="precision-dots">DPI Сетка (Точность)</option>
              </select>
            </div>
          </div>

          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg transition-colors border border-rose-500/20 font-bold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Очистить
          </button>
        </div>

        {/* Dynamic Painters board */}
        <div className="relative border border-slate-700 rounded-xl overflow-hidden shadow-inner h-96">
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={drawAction}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full block cursor-crosshair bg-[#090d16]"
          />

          {/* Floating instructions layer */}
          {!isDrawing && drawStats.totalPixels === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-6 pointer-events-none select-none bg-slate-950/20">
              <div className="p-5 rounded-xl bg-slate-950/95 border border-slate-700 max-w-sm backdrop-blur shadow-2xl">
                <CheckSquare className="w-7 h-7 text-indigo-400 mx-auto mb-2 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-150 mb-1 uppercase tracking-tight">
                  Тест Спецификации Рисования
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Зажмите левую кнопку мыши и рисуйте кривые, круги или спирали. Ложные скачки (срывы) выдадут себя рваными или угловатыми пиксельными скачками.
                </p>
              </div>
            </div>
          )}

          {/* Canvas velocity color code legend absolute layer */}
          <div className="absolute bottom-3 left-3 bg-slate-950/95 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-3 backdrop-blur shadow">
            <span>Скорость:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded" /> Низкая
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-yellow-500 rounded" /> Средняя
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded animate-pulse" /> Срыв/Резкая
            </span>
          </div>
        </div>
      </div>

      {/* Side Stats and evaluation */}
      <div className="lg:col-span-4 flex flex-col gap-4 font-mono">
        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-indigo-400" /> Оценки Точности
        </h4>

        <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-4">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Отрисовано пикселей:</span>
            <div className="text-xl font-bold text-slate-200 mt-0.5">{drawStats.totalPixels} px</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Макс. Скорость трекинга:</span>
            <div className="text-xl font-bold text-indigo-455 mt-0.5">{drawStats.maxSpeed} <span className="text-xs text-slate-500">px/s</span></div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Средняя скорость ведения:</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{drawStats.avSpeed} <span className="text-xs text-slate-500">px/s</span></div>
          </div>
        </div>

        {/* Diagnosis check */}
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
              Визуальные симптомы срыва:
            </span>
          </div>
          <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed font-sans">
            <p>
              <strong>1. Ломаные прямые углы:</strong> Если при ровном рисовании линия резко сгибается под 90 градусов или закидывается в угол — сенсор уходит в срыв (проверьте чистоту линзы).
            </p>
            <p>
              <strong>2. Пунктирные участки (Пропуск кадров):</strong> Если точки ложатся с большими пробелами при высокой скорости — линза проскальзывает по глянцу. Воспользуйтесь тканевым ковриком.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
