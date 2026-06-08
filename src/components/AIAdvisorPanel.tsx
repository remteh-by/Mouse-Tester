import { useState, useRef, useEffect } from 'react';
import { ChatMessage, ClickEventLog, ScrollEventLog } from '../types';
import { Share2, Send, Bot, User, Cpu, AlertCircle, Wrench, RefreshCw, Sparkles } from 'lucide-react';

interface AIAdvisorPanelProps {
  clickLogs: ClickEventLog[];
  scrollLogs: ScrollEventLog[];
  peakPollingRate: number;
}

export default function AIAdvisorPanel({ clickLogs, scrollLogs, peakPollingRate }: AIAdvisorPanelProps) {
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Compute stats on load
  const totalClicks = clickLogs.length;
  const totalDoubleClicks = clickLogs.filter(l => l.isDoubleClickDefect).length;
  const totalScrollJitters = scrollLogs.filter(s => s.isJitter).length;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick preset query handler
  const triggerPreset = async (promptText: string) => {
    if (!brand || !model) {
      setStatusMsg('Пожалуйста, сначала введите Марку и Модель вашей мышки выше!');
      setTimeout(() => setStatusMsg(''), 4000);
      return;
    }
    await sendMessageAction(promptText);
  };

  const sendMessageAction = async (forcedText?: string) => {
    const textToSend = forcedText || inputVal;
    if (!textToSend.trim()) return;

    if (!brand || !model) {
      setStatusMsg('Пожалуйста, сначала введите Марку и Модель вашей мышки выше!');
      setTimeout(() => setStatusMsg(''), 4000);
      return;
    }

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInputVal('');

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          model,
          stats: {
            totalClicks,
            totalDoubleClicks,
            totalScrollJitters,
            peakPollingRate,
          },
          message: textToSend,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка сервера при генерации ответа');
      }

      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: data.reply || 'Извините, не удалось сформировать инструкцию. Пожалуйста, попробуйте еще раз.',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: `⚠️ Не удалось связаться с Gemini AI. Пожалуйста, проверьте подключение и наличие ключа в Settings > Secrets.\n\nДетали ошибки: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInputVal('');
  };

  // Convert simple markdown headings and bullets into stylized HTML
  const formatText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('###')) {
        return <h5 key={idx} className="text-sm font-bold text-indigo-300 mt-2.5 mb-1 uppercase tracking-wide">{trimmed.replace('###', '')}</h5>;
      }
      if (trimmed.startsWith('##')) {
        return <h4 key={idx} className="text-base font-extrabold text-indigo-200 mt-3.5 mb-2.5 border-b border-indigo-950/40 pb-1">{trimmed.replace('##', '')}</h4>;
      }
      if (trimmed.startsWith('#')) {
        return <h3 key={idx} className="text-lg font-black text-slate-100 mt-4 mb-3">{trimmed.replace('#', '')}</h3>;
      }

      // Bold markers formatting representation
      let element: any = line;
      if (trimmed.match(/\*\*(.*?)\*\*/)) {
        // Simple regex replace for bold
        const parts = line.split('**');
        element = parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-indigo-400 font-bold">{part}</strong> : part);
      }

      // Bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <li key={idx} className="ml-5 list-disc text-xs text-slate-300 leading-relaxed my-1 font-sans">
            {typeof element === 'string' ? trimmed.substring(1).trim() : element}
          </li>
        );
      }

      // Number lines
      if (/^\d+\./.test(trimmed)) {
        return (
          <div key={idx} className="pl-2 py-0.5 text-xs text-slate-300 leading-relaxed my-1 flex gap-2 font-sans">
            <span className="text-indigo-500 font-bold font-mono">{trimmed.match(/^\d+\./)?.[0]}</span>
            <span>{line.replace(/^\d+\./, '').trim()}</span>
          </div>
        );
      }

      return <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1.5 min-h-[1px] font-sans">{element}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Target Mouse Spec Fields */}
      <div className="xl:col-span-4 flex flex-col gap-4 font-mono text-xs">
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>ПАСПОРТ УСТРОЙСТВА</span>
          </div>
          
          <div>
            <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">Бренд / Производитель</label>
            <input
              type="text"
              placeholder="Напр. Logitech, Razer, G-Wolves"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 outline-none text-xs transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">Модель Мыши</label>
            <input
              type="text"
              placeholder="Напр. G102, DeathAdder V3, GPX"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 outline-none text-xs transition-colors"
            />
          </div>

          {statusMsg && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-400 font-bold animate-pulse">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Auto collected telemetry payload summary */}
        <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-3.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span>Текущие результаты тестов:</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
              <span className="text-slate-500">ЛКМ/ПКМ Кликов:</span>
              <span className="text-slate-200 font-bold">{totalClicks} ({totalDoubleClicks} дабл)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
              <span className="text-slate-500">Ошибок Колесика:</span>
              <span className={totalScrollJitters > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{totalScrollJitters} шт.</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
              <span className="text-slate-500">Частота Поллинга:</span>
              <span className="text-indigo-400 font-bold">{peakPollingRate > 0 ? `${peakPollingRate} Гц` : 'Н/Д'}</span>
            </div>
          </div>
        </div>

        {/* Instructions presets */}
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
            <Wrench className="w-4 h-4 text-indigo-400" />
            <span>БЫСТРЫЕ ВОПРОСЫ ИИ</span>
          </div>

          <button
            onClick={() => triggerPreset('Как исправить двойной клик на этой кнопке мыши без паяльника?')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-indigo-500/30 text-slate-300 text-left transition-colors cursor-pointer hover:bg-slate-950 text-[11px] font-sans"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-455 shrink-0" />
            <span>Как исправить дабл-клик без пайки?</span>
          </button>

          <button
            onClick={() => triggerPreset('Как разобрать мышь, не испортив тефлоновые ножки (глайды)?')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-indigo-500/30 text-slate-300 text-left transition-colors cursor-pointer hover:bg-slate-950 text-[11px] font-sans"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-455 shrink-0" />
            <span>Как снять ножки, не испортив их?</span>
          </button>

          <button
            onClick={() => triggerPreset('Какие качественные микрики и энкодер посоветуешь купить на замену в эту модель?')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-indigo-500/30 text-slate-300 text-left transition-colors cursor-pointer hover:bg-slate-950 text-[11px] font-sans"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-455 shrink-0" />
            <span>Какие микрики купить на замену?</span>
          </button>
        </div>
      </div>

      {/* Main chat layout */}
      <div className="xl:col-span-8 flex flex-col bg-slate-900/60 border border-slate-700 rounded-xl p-4 h-[500px]">
        {/* Chat header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-slate-200">ИИ Консультант по Ремонту мышей</span>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Очистить диалог
          </button>
        </div>

        {/* Chat Content messages listing */}
        <div className="flex-1 overflow-y-auto pr-1 mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 px-6 py-12">
              <Bot className="w-12 h-12 text-slate-800 mb-2 animate-bounce" />
              <h4 className="font-bold text-slate-300 text-sm">Ваш ИИ-Инженер по Компьютерной Электронике</h4>
              <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed font-sans">
                Введите бренд, модель вашей мышки слева, и задайте вопрос или воспользуйтесь быстрой кнопкой. ИИ проанализирует показания датчиков и выдаст пошаговую инструкцию по ремонту!
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar representation */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border uppercase font-bold text-[10px] font-mono ${
                  m.sender === 'user' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-indigo-950 border-indigo-800 text-indigo-400'
                }`}>
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message text bubble */}
                <div className={`p-3.5 rounded-2xl text-xs border shadow-md ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-br from-indigo-950/40 to-slate-900 border-indigo-900/40 text-slate-200 rounded-tr-none'
                    : 'bg-slate-950/80 border-slate-800/80 text-slate-300 rounded-tl-none'
                }`}>
                  {m.sender === 'user' ? <p className="leading-relaxed whitespace-pre-wrap font-sans">{m.text}</p> : formatText(m.text)}
                </div>
              </div>
            ))
          )}

          {/* Assistant generated loader indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center text-xs text-indigo-400 font-mono">
              <Bot className="w-8 h-8 rounded-full border bg-indigo-950 border-indigo-800 flex items-center justify-center shrink-0 animate-spin" />
              <span className="animate-pulse">Gemini изучает чертежи мышки...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Задать свой вопрос: напр. «Что делать если сенсор зависает?»"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessageAction()}
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500/50 outline-none text-xs text-slate-300 rounded-xl px-4 py-3 placeholder-slate-600 transition-colors font-sans"
          />

          <button
            onClick={() => sendMessageAction()}
            disabled={isLoading}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
