import {useState} from 'react';
const URL='https://ko-fi.com/pavelzayats?utm_source=mouse_tester&utm_medium=app&utm_campaign=remteh_support';
export default function SupportPanel({compact=false,contextual=false}:{compact?:boolean;contextual?:boolean}){
 const [open,setOpen]=useState(false),[dismissed,setDismissed]=useState(()=>{try{return Number(localStorage.getItem('remteh-support-snooze-v1'))>Date.now();}catch{return false;}});
 function snooze(){try{localStorage.setItem('remteh-support-snooze-v1',String(Date.now()+30*86400000));}catch{/* Works without storage. */}setDismissed(true);setOpen(false);}
 if(contextual&&dismissed)return null;
 return <div className={compact?'support-compact':'support-panel'}>
  {!compact&&<div><h3>Тест помог разобраться с мышью?</h3><p>Поддержите бесплатные инструменты RemTeh и новые проверки.</p></div>}
  <a href={URL} target="_blank" rel="noopener noreferrer" onClick={()=>setOpen(true)}>{compact?'♡ Поддержать':'Поддержать на Ko-fi ↗'}</a>
  {!compact&&<><p className="muted">Разовый донат: $5 или своя сумма на Ko-fi. Получатель — RemTeh. Все проверки остаются бесплатными.</p><button className="support-snooze" onClick={snooze}>Не предлагать 30 дней</button></>}
  {open&&<p role="status" className="support-note">Откроется страница RemTeh. Сумму и способ оплаты выберите на Ko-fi. <button onClick={()=>setOpen(false)}>Понятно</button></p>}
 </div>;
}
