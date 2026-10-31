export type InputKind = 'mouse' | 'trackpad' | 'unknown';
export type EventSource = 'pointerrawupdate' | 'pointermove' | 'not-measured';
export type Observation = {t:number; kind:string; values:number[]};
export interface Conditions {input:InputKind; clickMode:'free'|'single'; bounceThresholdMs:number; scrollMode:'free'|'up'|'down'}
export interface Summary {totalClicks:number; suspectedBounce:number; scrollReversals:number; pointerEvents:number; eventRateHz:number|null; peakEventRateHz:number|null; completedHolds:number; meanHoldMs:number|null}
export interface Report {
  schema:1; kind:'mouse'; session_id:string; application:'RemTeh Mouse Tester'; version:string;
  started_at:string; timezone:string; duration_ms:number; environment:string; device:string;
  source:EventSource; transport:'browser-not-reported'; conditions:Conditions; observations:Observation[];
  summary:Summary; trace_truncated:boolean; comment:string; previous_session_id:string|null;
  conclusion:'not-measured'|'observed'|'suspicion'; limitations:string;
}
const finite=(value:unknown):value is number=>typeof value==='number' && Number.isFinite(value);
export class MouseSession {
  readonly id=crypto.randomUUID(); readonly startedAt=new Date().toISOString(); readonly start=performance.now();
  conditions:Conditions={input:'unknown',clickMode:'free',bounceThresholdMs:60,scrollMode:'free'};
  source:EventSource='not-measured'; events:Observation[]=[]; totalEvents=0;
  private downs=new Map<number,number>(); private releases=new Map<number,number>();
  private lastPointer:number|null=null; private lastSample=''; private pointerWindow:number[]=[];
  private intervalSum=0; private intervals=0; private holdSum=0; private lastWheel:number|null=null;
  summary:Summary={totalClicks:0,suspectedBounce:0,scrollReversals:0,pointerEvents:0,eventRateHz:null,peakEventRateHz:null,completedHolds:0,meanHoldMs:null};
  record(kind:string,t:number,values:number[]) {
    if(!finite(t)||values.some(value=>!finite(value))) return;
    this.events.push({kind,t:Math.max(0,t-this.start),values}); this.totalEvents++;
    if(this.events.length>512) this.events.shift();
  }
  down(button:number,t:number) {
    if(this.downs.has(button))return;
    const previous=this.releases.get(button),gap=previous===undefined?null:t-previous;
    const suspect=this.conditions.clickMode==='single' && gap!==null && gap>=0 && gap<this.conditions.bounceThresholdMs;
    this.summary.totalClicks++; if(suspect)this.summary.suspectedBounce++;
    this.downs.set(button,t);this.record('down',t,[button,gap??-1,suspect?1:0]);
  }
  up(button:number,t:number) {
    const start=this.downs.get(button);if(start===undefined)return;
    this.downs.delete(button);this.releases.set(button,t);
    const duration=t-start;if(duration>=0){this.holdSum+=duration;this.summary.completedHolds++;this.summary.meanHoldMs=this.holdSum/this.summary.completedHolds;}
    this.record('up',t,[button,Math.max(0,duration)]);
  }
  pointer(t:number,x:number,y:number,source:EventSource,pointerType:string) {
    if(pointerType!=='mouse'||!finite(t)||!finite(x)||!finite(y))return;
    const sample=[t,x,y].join(':');if(sample===this.lastSample)return;this.lastSample=sample;
    this.source=source;this.summary.pointerEvents++;
    const delta=this.lastPointer===null?null:t-this.lastPointer;
    if(delta!==null && delta>0 && delta<=250){this.intervalSum+=delta;this.intervals++;this.summary.eventRateHz=1000*this.intervals/this.intervalSum;}
    if(delta===null || delta<=0 || delta>250)this.pointerWindow=[];
    this.lastPointer=t;this.pointerWindow.push(t);
    while(this.pointerWindow.length>1 && t-this.pointerWindow[0]>1000)this.pointerWindow.shift();
    const span=t-this.pointerWindow[0];
    if(span>=500){const rate=(this.pointerWindow.length-1)*1000/span;this.summary.peakEventRateHz=Math.max(this.summary.peakEventRateHz??0,rate);}
    this.record('pointer',t,[x,y]);
  }
  wheel(t:number,dx:number,dy:number,mode:number) {
    if(!finite(dy)||!finite(dx)||dy===0){this.record('wheel',t,[dx,dy,mode,0]);return;}
    const previous=this.lastWheel;this.lastWheel=t;
    const expected=this.conditions.scrollMode==='up'?-1:this.conditions.scrollMode==='down'?1:0;
    // Only flag a short opposite step during an explicitly guided mouse test.
    const suspect=this.conditions.input==='mouse' && expected!==0 && Math.sign(dy)!==expected
      && previous!==null && t-previous>0 && t-previous<=120 && Math.abs(dy)>Math.abs(dx);
    if(suspect)this.summary.scrollReversals++;
    this.record('wheel',t,[dx,dy,mode,suspect?1:0]);
  }
  pause(){this.downs.clear();this.releases.clear();this.lastPointer=null;this.lastWheel=null;this.pointerWindow=[];this.lastSample='';}
  report(device='',comment='',previous:string|null=null):Report {
    return {schema:1,kind:'mouse',session_id:this.id,application:'RemTeh Mouse Tester',version:'1.2.1',
      started_at:this.startedAt,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,duration_ms:Math.max(0,performance.now()-this.start),
      environment:typeof navigator==='undefined'?'test':navigator.userAgent,device:device.slice(0,160),source:this.source,
      transport:'browser-not-reported',conditions:{...this.conditions},observations:this.events.map(event=>({...event,values:[...event.values]})),
      summary:{...this.summary},trace_truncated:this.totalEvents>this.events.length,comment:comment.slice(0,2000),previous_session_id:previous,
      conclusion:this.summary.suspectedBounce||this.summary.scrollReversals?'suspicion':this.totalEvents?'observed':'not-measured',
      limitations:'Browser events, not USB polling, sensor accuracy, hardware latency or a confirmed hardware diagnosis. OS/browser processing and timer precision affect results. Mouse/trackpad is user-declared. Last 512 observations only.'};
  }
}

export function parseReport(text:string):Report {
  if(new TextEncoder().encode(text).length>524288)throw new Error('Файл больше 512 КБ');
  const value=JSON.parse(text);
  if(!value || value.schema!==1 || value.kind!=='mouse' || value.application!=='RemTeh Mouse Tester'
    || !['pointerrawupdate','pointermove','not-measured'].includes(value.source)
    || !['not-measured','observed','suspicion'].includes(value.conclusion))throw new Error('Нужен отчёт Mouse Tester schema 1');
  for(const key of ['session_id','started_at','timezone','environment','device','comment','limitations','version'])
    if(typeof value[key]!=='string'||value[key].length>(key==='comment'||key==='limitations'?2000:400))throw new Error('Повреждены поля отчёта');
  if(!finite(value.duration_ms)||value.duration_ms<0||value.duration_ms>31536000000||!Number.isFinite(Date.parse(value.started_at)))throw new Error('Неверное время сессии');
  const c=value.conditions;
  if(!c||!['mouse','trackpad','unknown'].includes(c.input)||!['free','single'].includes(c.clickMode)||!['free','up','down'].includes(c.scrollMode)||!finite(c.bounceThresholdMs)||c.bounceThresholdMs<20||c.bounceThresholdMs>200)throw new Error('Неверные условия теста');
  if(!value.summary||Object.keys(value.summary).length!==8)throw new Error('Неверные измерения');
  for(const key of ['totalClicks','suspectedBounce','scrollReversals','pointerEvents','completedHolds'])
    if(!Number.isSafeInteger(value.summary[key])||value.summary[key]<0||value.summary[key]>1e12)throw new Error('Неверный счётчик');
  for(const key of ['eventRateHz','peakEventRateHz','meanHoldMs'])
    if(value.summary[key]!==null && (!finite(value.summary[key])||value.summary[key]<0||value.summary[key]>1e9))throw new Error('Неверное измерение');
  if(value.summary.suspectedBounce>value.summary.totalClicks || value.summary.completedHolds>value.summary.totalClicks)throw new Error('Несогласованные счётчики');
  if(!Array.isArray(value.observations)||value.observations.length>512)throw new Error('Неверный журнал');
  for(const row of value.observations)
    if(!row||!['down','up','pointer','wheel'].includes(row.kind)||!finite(row.t)||row.t<0||!Array.isArray(row.values)||row.values.length>4||row.values.some((v:unknown)=>!finite(v)||Math.abs(v)>1e12))throw new Error('Повреждён журнал');
  if(value.previous_session_id!==null && (typeof value.previous_session_id!=='string'||value.previous_session_id.length>100))throw new Error('Неверная ссылка на сессию');
  if(typeof value.trace_truncated!=='boolean')throw new Error('Неверный размер выборки');
  return value as Report;
}
