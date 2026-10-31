import {useEffect,useRef,useState} from 'react';
import type {Report} from '../diagnostics';
const staticSite=import.meta.env.MODE==='site';
export default function AIAdvisor({report}:{report:Report}){
 const [enabled,setEnabled]=useState(false),[token,setToken]=useState(''),[consent,setConsent]=useState(false),[question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{if(staticSite)return;const controller=new AbortController();fetch('/api/status',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(value=>setEnabled(value?.aiEnabled===true)).catch(()=>{});return()=>{controller.abort();pending.current?.abort();};},[]);
 async function send(){
  if(staticSite||!enabled||!consent||!token||!question.trim()||busy)return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setAnswer('');const timer=setTimeout(()=>controller.abort(),25000);
  try{const response=await fetch('/api/diagnose',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({brand:'',model:report.device.slice(0,80),message:question,consent:true,history:[],stats:{totalClicks:report.summary.totalClicks,suspectedBounce:report.summary.suspectedBounce,scrollReversals:report.summary.scrollReversals,pointerEvents:report.summary.pointerEvents,eventRateHz:report.summary.eventRateHz,clickMode:report.conditions.clickMode,scrollMode:report.conditions.scrollMode,source:report.source}})});const result=await response.json();setAnswer(response.ok?result.reply:result.error||'ИИ временно недоступен.');}
  catch{setAnswer('Запрос отменён или связь недоступна. Измерения сохранены.');}finally{clearTimeout(timer);pending.current=null;setBusy(false);}
 }
 if(staticSite)return <section><h2>ИИ-помощник</h2><p>В онлайн-версии ИИ-помощник не подключён. Все проверки мыши, история и отчёты работают без него.</p><p>Измерения сохраняются в вашем браузере. Отчёт можно экспортировать в JSON или распечатать.</p></section>;
 return <section><h2>ИИ-помощник</h2><p>Передаёт Google Gemini название устройства, вопрос и показанные счётчики. Комментарий мастера, история сессий и исходные события не отправляются. Ответ требует проверки мастером.</p><p>{enabled?'Нужен код доступа оператора.':'ИИ выключен или сервер недоступен. Все измерения и отчёты продолжают работать.'}</p><label>Код доступа оператора<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} maxLength={512}/></label><label>Вопрос<textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2000}/></label><label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Согласен передать вопрос и текущие показатели Google Gemini</label><button disabled={!enabled||!consent||!token||!question.trim()||busy} onClick={send}>Отправить вопрос</button>{busy&&<button onClick={()=>pending.current?.abort()}>Отменить</button>}<p className="ai-answer" role="status">{answer}</p></section>;
}
