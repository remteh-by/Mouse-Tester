import {useEffect,useRef,useState} from 'react';

export default function OfflineStatus({beforeUpdate}:{beforeUpdate:()=>boolean}) {
  const [ready,setReady]=useState(false),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[updatedElsewhere,setUpdatedElsewhere]=useState(false),[offline,setOffline]=useState(!navigator.onLine),[message,setMessage]=useState('');
  const reload=useRef(false);
  useEffect(()=>{
    if(import.meta.env.MODE!=='site'||!('serviceWorker' in navigator))return;
    if(navigator.serviceWorker.controller)setReady(true);
    let alive=true,controlled=Boolean(navigator.serviceWorker.controller),timer:ReturnType<typeof setInterval>|undefined;
    const online=()=>setOffline(!navigator.onLine);
    const changed=()=>{if(reload.current)location.reload();else if(controlled)setUpdatedElsewhere(true);controlled=true;};
    navigator.serviceWorker.addEventListener('controllerchange',changed);
    window.addEventListener('online',online);window.addEventListener('offline',online);
    navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(reg=>{
      if(!alive)return;
      if(reg.waiting)setWaiting(reg.waiting);
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(alive&&worker.state==='installed'&&reg.active)setWaiting(reg.waiting);});});
      void navigator.serviceWorker.ready.then(()=>{if(alive)setReady(true);});
      timer=setInterval(()=>{if(navigator.onLine)void reg.update().catch(()=>{});},60*60*1000);
    }).catch(()=>{if(alive&&!navigator.serviceWorker.controller)setMessage('Автономная копия пока недоступна. Текущие тесты работают.');});
    return()=>{alive=false;if(timer)clearInterval(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);window.removeEventListener('online',online);window.removeEventListener('offline',online);};
  },[]);
  if(import.meta.env.MODE!=='site')return null;
  return <div className="offline-status" aria-label="Автономный режим"><span role="status">{message|| (offline?'Браузер офлайн · тесты и локальные отчёты доступны':ready?'Готово к запуску без сети':'Подготовка автономной копии…')}</span>{(waiting||updatedElsewhere)&&<button onClick={()=>{if(!beforeUpdate())return;if(updatedElsewhere){location.reload();return;}reload.current=true;waiting?.postMessage({type:'ACTIVATE_UPDATE'});}}>Сохранить сессию и обновить</button>}</div>;
}
