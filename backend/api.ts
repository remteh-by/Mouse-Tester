import express, {type ErrorRequestHandler} from 'express';
import {createHash,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface DiagnosticRequest {brand:string;model:string;message:string;consent:true;history:{role:'user'|'model';text:string}[];stats:{totalClicks:number;suspectedBounce:number;scrollReversals:number;pointerEvents:number;eventRateHz:number|null;clickMode:'free'|'single';scrollMode:'free'|'up'|'down';source:'pointerrawupdate'|'pointermove'|'not-measured'}}
export function validateRequest(input:unknown):DiagnosticRequest {
  const value=input as DiagnosticRequest;
  const plain=(v:unknown):v is Record<string,unknown>=>v!==null && typeof v==='object'&&!Array.isArray(v);
  if(!plain(value)||Object.keys(value).some(key=>!['brand','model','message','consent','history','stats'].includes(key))||value.consent!==true)throw new Error('invalid');
  for(const key of ['brand','model','message'] as const)
    if(typeof value[key]!=='string'||value[key].length>(key==='message'?2000:80))throw new Error('invalid');
  if(!value.message.trim()||!Array.isArray(value.history)||value.history.length>6)throw new Error('invalid');
  for(const entry of value.history)if(!plain(entry)||Object.keys(entry).length!==2||!['user','model'].includes(entry.role)||typeof entry.text!=='string'||entry.text.length>1000)throw new Error('invalid');
  const stats=value.stats;
  if(!plain(stats)||Object.keys(stats).length!==8)throw new Error('invalid');
  for(const key of ['totalClicks','suspectedBounce','scrollReversals','pointerEvents'] as const)
    if(!Number.isSafeInteger(stats[key])||stats[key]<0||stats[key]>1e9)throw new Error('invalid');
  if(stats.suspectedBounce>stats.totalClicks)throw new Error('invalid');
  if(stats.eventRateHz!==null && (typeof stats.eventRateHz!=='number'||!Number.isFinite(stats.eventRateHz)||stats.eventRateHz<0||stats.eventRateHz>100000))throw new Error('invalid');
  if(!['free','single'].includes(stats.clickMode)||!['free','up','down'].includes(stats.scrollMode)||!['pointerrawupdate','pointermove','not-measured'].includes(stats.source))throw new Error('invalid');
  if(JSON.stringify(value).length>8000)throw new Error('invalid');
  return value;
}
export interface ApiOptions {enabled:boolean;accessToken:string;dailyLimit:number;dataDirectory:string;origin?:string;timeoutMs?:number;now?:()=>number;transport:(input:DiagnosticRequest,signal:AbortSignal)=>Promise<string>}
export function createApi(options:ApiOptions) {
  const app=express();app.disable('x-powered-by');app.set('trust proxy',false);
  const now=options.now??Date.now,requests:number[]=[];
  let busy=false;
  const enabled=options.enabled && options.accessToken.length>=32 && Number.isInteger(options.dailyLimit) && options.dailyLimit>0 && options.dailyLimit<=100;
  app.use((_req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});next();});
  app.get('/api/status',(_req,res)=>res.json({aiEnabled:enabled,provider:'Google Gemini',access:'operator-token',dailyRequestLimit:enabled?options.dailyLimit:0}));
  app.post('/api/diagnose',(req,res,next)=>{
    if(!enabled){res.status(503).json({error:'ИИ отключён. Все измерения и отчёты доступны без него.'});return;}
    const auth=req.get('authorization')??'';
    const supplied=auth.startsWith('Bearer ')?auth.slice(7):'';
    const hash=(text:string)=>createHash('sha256').update(text).digest();
    if(!supplied||!timingSafeEqual(hash(supplied),hash(options.accessToken))){res.status(401).json({error:'Нужен код доступа оператора.'});return;}
    if(req.get('origin') && (!options.origin || req.get('origin')!==options.origin)){res.status(403).json({error:'Недопустимый источник запроса.'});return;}
    const time=now();while(requests.length && requests[0]<=time-60000)requests.shift();
    if(requests.length>=5){res.set('Retry-After','60').status(429).json({error:'Не более пяти запросов в минуту.'});return;}
    requests.push(time);next();
  },express.json({limit:'16kb',strict:true}),async(req,res)=>{
    let input:DiagnosticRequest;
    try{input=validateRequest(req.body);}catch{res.status(400).json({error:'Проверьте поля, размеры сообщений и результаты измерений.'});return;}
    if(busy){res.set('Retry-After','5').status(429).json({error:'Один запрос уже выполняется.'});return;} busy=true;
    const controller=new AbortController();
    const disconnect=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnect);
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      await fs.mkdir(options.dataDirectory,{recursive:true,mode:0o700});
      const file=path.join(options.dataDirectory,'ai-quota.json'),day=new Date(now()).toISOString().slice(0,10);
      let count=0;
      try{const stored=JSON.parse(await fs.readFile(file,'utf8'));if(typeof stored.day!=='string'||!Number.isSafeInteger(stored.count)||stored.count<0)throw new Error('quota');if(stored.day===day)count=stored.count;}
      catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      if(count>=options.dailyLimit){res.status(429).json({error:'Дневная квота ИИ исчерпана. Измерения доступны.'});return;}
      // Reserve before sending: cancellation does not refund a potentially billed request.
      await fs.writeFile(file+'.tmp',JSON.stringify({day,count:count+1}),{mode:0o600});await fs.rename(file+'.tmp',file);
      const timeout=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'));},options.timeoutMs??20000);});
      const reply=await Promise.race([options.transport(input,controller.signal),timeout]);
      if(typeof reply!=='string'||!reply.trim()||reply.length>12000)throw new Error('response');
      if(!controller.signal.aborted && !res.destroyed)res.json({reply});
    } catch(error) {
      if(!res.destroyed){const code=(error as {status?:number}).status;res.status(code===429?429:controller.signal.aborted?504:502).json({error:code===429?'Сервис ИИ ограничил запросы. Повторите позднее.':'ИИ временно недоступен. Измерения сохранены; повторите позднее.'});}
    } finally {if(timer)clearTimeout(timer);res.off('close',disconnect);busy=false;}
  });
  app.use('/api',(_req,res)=>res.status(404).json({error:'Неизвестный адрес API.'}));
  const errors:ErrorRequestHandler=(error,_req,res,_next)=>{res.status(error.type==='entity.too.large'?413:400).json({error:'Некорректный или слишком большой запрос.'});};
  app.use(errors);return app;
}
