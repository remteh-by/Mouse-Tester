import {useId,useState} from 'react';
import catalog from '../../support/registry.json';
import './SupportMethods.css';
export default function SupportMethods({language='en',onOpen}){
 const id=useId(),copy=catalog.texts[language]||catalog.texts.en;
 const [selected,setSelected]=useState(()=>{try{const saved=localStorage.getItem('remteh-support-method-v1');return catalog.methods.some(m=>m.id===saved)?saved:'kofi';}catch{return 'kofi';}});
 const [notice,setNotice]=useState('');
 const method=catalog.methods.find(m=>m.id===selected)||catalog.methods[0];
 function choose(value){setSelected(value);setNotice('');try{localStorage.setItem('remteh-support-method-v1',value);}catch{/* Optional preference: opening, copying and QR still work. */}}
 async function open(event){if(!onOpen)return;event.preventDefault();try{await onOpen(method.id);}catch{setNotice(copy.support_copy_failed+' '+copy.scan_phone);}}
 async function copyLink(){try{await navigator.clipboard.writeText(method.url);setNotice(copy.support_copied);}catch{setNotice(copy.support_copy_failed);}}
 return <section className="remteh-support" aria-label={copy.support_choose} dir={language==='ar'?'rtl':'ltr'}>
  <p>{copy.support_note}</p><label htmlFor={id}>{copy.support_choose}</label>
  <select id={id} value={method.id} onChange={event=>choose(event.target.value)}>{catalog.methods.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select>
  <p className="support-cadence">{copy['method_cadence_'+method.cadence]}</p><p className="support-readiness">{copy['method_status_'+method.status]}</p>
  <p className="support-destination" dir="ltr">{method.url}</p>
  <div className="support-actions"><a href={method.url} target="_blank" rel="noopener noreferrer" onClick={open}>{copy.support_open_provider} ↗</a><button type="button" onClick={copyLink}>{copy.support_copy_link}</button></div>
  <p role="status">{notice}</p><details><summary>{copy.scan_phone}</summary><img src={import.meta.env.BASE_URL+'assets/support/'+method.id+'.svg'} alt={copy.scan_phone+' · '+method.title} width="220" height="220"/></details><p>{copy.support_provider_note}</p>
 </section>;
}
