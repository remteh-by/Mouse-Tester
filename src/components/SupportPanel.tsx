import {useRef,useState} from 'react';
import SupportMethods from './SupportMethods';
export default function SupportPanel({compact=false,contextual=false}:{compact?:boolean;contextual?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [dismissed,setDismissed]=useState(()=>{try{return Number(localStorage.getItem('remteh-support-snooze-v1'))>Date.now();}catch{return false;}});
 function snooze(){try{localStorage.setItem('remteh-support-snooze-v1',String(Date.now()+30*86400000));}catch{/* Works without storage. */}setDismissed(true);}
 if(contextual&&dismissed)return null;
 return <div className={compact?'support-compact':'support-panel'}>
  {!compact&&<div><h3>Тест помог разобраться с мышью?</h3><p>Поддержите бесплатные инструменты RemTeh и новые проверки.</p></div>}
  <button className="support-trigger" onClick={()=>dialog.current?.showModal()}>{compact?'♡ Поддержать':'Выбрать способ поддержки'}</button>
  {!compact&&<><p className="muted">Разовая или регулярная поддержка — по желанию. Все проверки остаются бесплатными.</p><button className="support-snooze" onClick={snooze}>Не предлагать 30 дней</button></>}
  <dialog ref={dialog} className="remteh-support-dialog" aria-label="Поддержка RemTeh"><form method="dialog"><button aria-label="Закрыть">×</button></form><SupportMethods language="ru" onOpen={undefined}/></dialog>
 </div>;
}
