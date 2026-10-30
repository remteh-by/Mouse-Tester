import {useEffect,useRef,useState} from 'react';
import {MouseSession,parseReport,type Report,type Conditions} from './diagnostics';
import SensorCanvas from './components/SensorCanvas';
import {PRESET_GUIDES} from './data/guides';
import AIAdvisor from './components/AIAdvisor';

const format=(value:number|null,suffix='')=>value===null?'Не измерено':value.toLocaleString('ru-RU',{maximumFractionDigits:1})+suffix;
const tabs=[['buttons','Кнопки'],['wheel','Колесо'],['movement','Движение'],['sensor','Рисование'],['report','Отчёт'],['guides','Справочник'],['ai','ИИ-помощник']] as const;
export default function App(){
  const [session,setSession]=useState(()=>new MouseSession());
  const [tab,setTab]=useState<string>('buttons'),[view,setView]=useState(()=>session.report());
  const [device,setDevice]=useState(''),[comment,setComment]=useState(''),[baseline,setBaseline]=useState<Report|null>(null);
  const [notice,setNotice]=useState(''),[history,setHistory]=useState<Report[]>([]),[sound,setSound]=useState(false);
  const panel=useRef<HTMLDivElement>(null),audio=useRef<AudioContext|null>(null),lastSound=useRef(0);
  const report=()=>session.report(device,comment,baseline?.session_id??null);
  useEffect(()=>{try{const stored=localStorage.getItem('remteh-mouse-history-v1');if(stored&&stored.length<5*1024*1024){const rows=JSON.parse(stored);if(Array.isArray(rows))setHistory(rows.slice(0,20).map(row=>parseReport(JSON.stringify(row))));}}catch{setNotice('Локальная история недоступна. Экспорт JSON продолжает работать.');}},[]);
  useEffect(()=>{
    const timer=setInterval(()=>setView(session.report()),200);
    const pause=()=>session.pause();window.addEventListener('blur',pause);
    const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);
    return()=>{clearInterval(timer);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility);session.pause();};
  },[session]);
  useEffect(()=>()=>{void audio.current?.close();audio.current=null;},[]);
  useEffect(()=>{
    const element=panel.current;if(!element)return;
    const source='onpointerrawupdate' in window?'pointerrawupdate':'pointermove';
    const move=(event:PointerEvent)=>{
      if(tab!=='movement')return;
      const samples=event.getCoalescedEvents?.();
      for(const point of samples?.length?samples:[event])session.pointer(point.timeStamp,point.clientX,point.clientY,source,point.pointerType);
    };
    const wheel=(event:WheelEvent)=>{if(tab==='wheel'){event.preventDefault();session.wheel(event.timeStamp,event.deltaX,event.deltaY,event.deltaMode);}};
    const release=(event:PointerEvent)=>{if(tab==='buttons')session.up(event.button,event.timeStamp);};
    element.addEventListener(source,move as EventListener);element.addEventListener('wheel',wheel,{passive:false});window.addEventListener('pointerup',release);
    return()=>{element.removeEventListener(source,move as EventListener);element.removeEventListener('wheel',wheel);window.removeEventListener('pointerup',release);session.pause();};
  },[session,tab]);
  function tick(){if(!sound||performance.now()-lastSound.current<100)return;lastSound.current=performance.now();try{const context=audio.current??(audio.current=new AudioContext());void context.resume();const oscillator=context.createOscillator(),gain=context.createGain();gain.gain.value=.02;oscillator.frequency.value=600;oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start();oscillator.stop(context.currentTime+.025);}catch{setNotice('Звук недоступен; измерения продолжаются.');}}
  function save(){try{const current=report(),rows=[current,...history.filter(row=>row.session_id!==current.session_id)].slice(0,20);localStorage.setItem('remteh-mouse-history-v1',JSON.stringify(rows));setHistory(rows);setNotice('Сессия сохранена только в этом браузере.');return true;}catch{setNotice('Не удалось сохранить историю. Текущая сессия остаётся открытой; экспортируйте JSON.');return false;}}
  function download(){const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='remteh-mouse-'+session.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function conditions(change:Partial<Conditions>){if(session.totalEvents)return;session.conditions={...session.conditions,...change};setView(session.report());}
  const measured=view.summary,locked=session.totalEvents>0;
  return <div className="lab-shell">
    <header className="lab-header"><div><p className="eyebrow">REMTEH · DEVICE LAB</p><h1>Mouse Tester</h1><p>Наблюдения, которые можно сохранить и сравнить.</p></div><span className="version">1.1.0 · Preview</span></header>
    <div className="session-bar"><label>Устройство<input value={device} maxLength={160} placeholder="Модель, без серийного номера" onChange={e=>setDevice(e.target.value)}/></label><label>Источник ввода<select disabled={locked} value={view.conditions.input} onChange={e=>conditions({input:e.target.value as Conditions['input']})}><option value="unknown">Не указан</option><option value="mouse">Мышь</option><option value="trackpad">Трекпад</option></select></label><button onClick={()=>{if(!save())return;const next=new MouseSession();setSession(next);setView(next.report());setComment('');setNotice('Предыдущая сессия сохранена. Начата новая.');}}>Новая сессия</button><label className="check"><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>Звук нажатия</label></div>
    <nav className="tabs" aria-label="Проверки">{tabs.map(([id,title])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{title}</button>)}</nav>
    <p role="status" className="notice">{notice}</p>
    <main className="lab-grid">
      <section className="workspace" aria-label="Рабочая область">
      {['buttons','wheel','movement'].includes(tab)&&<>
        <h2>{tab==='buttons'?'Нажатия и удержание':tab==='wheel'?'Пошаговое вращение колеса':'Частота событий браузера'}</h2>
        {tab==='buttons'&&<div className="conditions"><label>Сценарий<select disabled={locked} value={view.conditions.clickMode} onChange={e=>conditions({clickMode:e.target.value as Conditions['clickMode']})}><option value="free">Свободные клики — без диагноза</option><option value="single">Одиночные нажатия с паузой</option></select></label><label>Порог подозрения, мс<input type="number" min={20} max={200} disabled={locked} value={view.conditions.bounceThresholdMs} onChange={e=>conditions({bounceThresholdMs:Math.max(20,Math.min(200,Number(e.target.value)||60))})}/></label><p>В одиночном тесте нажимайте и отпускайте кнопку раз в секунду. Быстрый повтор после отпускания — только подозрение. Обычный двойной клик в свободном режиме не считается дефектом.</p></div>}
        {tab==='wheel'&&<div className="conditions"><label>Сценарий<select disabled={locked} value={view.conditions.scrollMode} onChange={e=>conditions({scrollMode:e.target.value as Conditions['scrollMode']})}><option value="free">Свободная прокрутка</option><option value="down">Только вниз, по одному шагу</option><option value="up">Только вверх, по одному шагу</option></select></label><p>Считаются короткие противоположные шаги в заданном направлении. Пауза, горизонтальная прокрутка и трекпад не признаются поломкой энкодера.</p></div>}
        {tab==='movement'&&<p>Двигайте мышью внутри панели непрерывно несколько секунд. Измеряется доставка событий браузеру. USB polling rate, DPI и аппаратная задержка здесь не измеряются.</p>}
        <div ref={panel} className="test-area" tabIndex={0} role="region" aria-label="Панель измерений" onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(tab==='buttons'&&e.pointerType==='mouse'){session.down(e.button,e.timeStamp);tick();}}}>
          <span className="target-mark" aria-hidden="true">＋</span><strong>{tab==='buttons'?'Нажимайте кнопки здесь':tab==='wheel'?'Прокручивайте здесь':'Двигайте мышью здесь'}</strong><span>Измерения остаются при переключении вкладок</span>
        </div>
        <p className="muted">Условия фиксируются после первого события. Для другого сценария начните новую сессию.</p>
      </>}
      <div hidden={tab!=='sensor'}><h2>Рисование траектории</h2><p>Визуальная проверка в CSS-пикселях. Не измеряет DPI или точность сенсора в миллиметрах.</p><SensorCanvas/></div>
      {tab==='guides'&&<><h2>Справочник проверок</h2><p>Возможные причины требуют подтверждения. Не разбирайте подключённое устройство.</p>{PRESET_GUIDES.map(guide=><details key={guide.id}><summary>{guide.title}</summary><p>{guide.symptom}</p><p>Возможные причины: {guide.causes.join('; ')}.</p><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol></details>)}</>}
      {tab==='report'&&<section className="print-report"><h2>Отчёт сессии</h2><p>{device||'Устройство не указано'} · {new Date(session.startedAt).toLocaleString('ru-RU')}</p><p className="mono">ID {session.id}</p><p>Результат: {view.conclusion==='not-measured'?'не измерено':view.conclusion==='suspicion'?'есть подозрительные события, нужна повторная проверка':'наблюдения получены; исправность не подтверждена автоматически'}</p><label>Комментарий мастера<textarea maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)}/></label><div className="actions no-print"><button onClick={save}>Сохранить сессию</button><button onClick={download}>Экспорт JSON</button><button onClick={()=>window.print()}>Печать / PDF</button><label className="file-action">Сравнить с JSON<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>524288)throw new Error('Файл больше 512 КБ');setBaseline(parseReport(await file.text()));setNotice('Файл открыт для сравнения; текущая сессия сохранена.');}catch(error){setNotice((error as Error).message);}}}/></label></div>
        {baseline&&<><h3>До / после</h3><p>{baseline.device||'Устройство не указано'} → {device||'Устройство не указано'}</p><p>{JSON.stringify(baseline.conditions)===JSON.stringify(view.conditions)&&baseline.source===view.source&&baseline.device===device?'Условия совпадают по сохранённым полям.':'Условия, источник или название устройства отличаются: прямое сравнение ограничено.'}</p><table><thead><tr><th>Наблюдение</th><th>До</th><th>Сейчас</th></tr></thead><tbody><tr><td>Нажатия</td><td>{baseline.summary.totalClicks}</td><td>{measured.totalClicks}</td></tr><tr><td>Подозрения на повтор</td><td>{baseline.summary.suspectedBounce}</td><td>{measured.suspectedBounce}</td></tr><tr><td>События, Гц</td><td>{format(baseline.summary.eventRateHz)}</td><td>{format(measured.eventRateHz)}</td></tr></tbody></table></>}
        <h3>Условия и ограничения</h3><p>Ввод: {view.conditions.input}; сценарий кликов: {view.conditions.clickMode}; порог: {view.conditions.bounceThresholdMs} мс; колесо: {view.conditions.scrollMode}. Источник: {view.source}. Уверенность: только наблюдения браузера; физический диагноз не установлен.</p><p>Объём: {measured.pointerEvents} событий движения, {measured.totalClicks} нажатий. В экспорт входят последние 512 наблюдений; суммарные счётчики не обрезаются. Таймеры, обработка ОС и браузер влияют на результат.</p><p className="mono">{navigator.userAgent}</p>
        <h3 className="no-print">История на этом устройстве</h3><div className="history no-print">{history.length?history.map(row=><button key={row.session_id} onClick={()=>setBaseline(row)}>{new Date(row.started_at).toLocaleString('ru-RU')} · {row.device||'Без названия'}</button>):<p>Сохранённых сессий пока нет.</p>}</div></section>}
      <div hidden={tab!=='ai'}><AIAdvisor report={report()}/></div>
      </section>
      <aside className="measurements" aria-label="Измерения сессии"><p className="eyebrow">ТЕКУЩАЯ СЕССИЯ</p><h2>Наблюдения</h2><dl><div><dt>Нажатия за всю сессию</dt><dd>{measured.totalClicks}</dd></div><div><dt>Подозрения на повтор</dt><dd>{measured.suspectedBounce}</dd></div><div><dt>Короткие обратные шаги</dt><dd>{measured.scrollReversals}</dd></div><div><dt>Среднее удержание</dt><dd>{format(measured.meanHoldMs,' мс')}</dd></div><div><dt>Частота событий браузера</dt><dd>{format(measured.eventRateHz,' Гц')}</dd></div><div><dt>Пик окна ≥ 500 мс</dt><dd>{format(measured.peakEventRateHz,' Гц')}</dd></div></dl><p className="muted">Источник: {view.source}. Событий движения: {measured.pointerEvents}. Нет данных — не означает «исправно».</p><details><summary>Последние события ({Math.min(20,view.observations.length)})</summary><ol className="event-log">{view.observations.slice(-20).reverse().map((event,index)=><li key={index}>{event.kind} · {event.t.toFixed(1)} мс · {event.values.map(value=>value.toFixed(1)).join(', ')}</li>)}</ol></details></aside>
    </main><footer>Измерения, история и отчёты работают без ИИ и без отправки данных. Перед закрытием вкладки сохраните сессию. После загрузки страницы измерения работают без сети.</footer>
  </div>;
}
