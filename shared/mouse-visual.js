/* Original RemTeh mouse illustration with physical button and wheel feedback. */
const styleURL = new URL('./mouse-visual.css',import.meta.url).href;
const logoURL = new URL('./remteh-logo-white.png',import.meta.url).href;
export class RemtehMouse extends HTMLElement {
 static observedAttributes=['src','pressed'];
 constructor(){
  super();this.attachShadow({mode:'open'});this.downs=new Set();this.cleanups=[];
 }
 connectedCallback(){
  if(!this.shadowRoot.childNodes.length){
   const keys=[['left',0],['wheel',1],['right',2],['back',3],['forward',4]];
   this.shadowRoot.innerHTML=`<link rel="stylesheet" href="${styleURL}"><div class="device"><div class="art"><img class="base" alt="Мышь RemTeh" draggable="false">${keys.map(([name,button])=>`<img class="press-well ${name}" data-button="${button}" alt="" draggable="false"><img class="layer ${name}" data-button="${button}" alt="" draggable="false">`).join('')}<div class="brand-engraving"><img class="brand" src="${logoURL}" alt="Официальный логотип RemTeh" draggable="false"><img class="brand-sheen" src="${logoURL}" alt="" draggable="false" aria-hidden="true"></div></div><span class="press-arrow main-left" data-button="0" aria-hidden="true">↓</span><span class="press-arrow main-right" data-button="2" aria-hidden="true">↓</span><span class="press-arrow middle" data-button="1" aria-hidden="true">↓</span><div class="side-key forward" data-button="4" aria-hidden="true"><span class="side-cap"></span></div><div class="side-key back" data-button="3" aria-hidden="true"><span class="side-cap"></span></div><span class="side-title" aria-hidden="true">Боковые</span><span class="press-arrow side-forward" data-button="4" aria-hidden="true">→</span><span class="press-arrow side-back" data-button="3" aria-hidden="true">→</span><span class="side-label forward" data-button="4" aria-hidden="true">Вперёд</span><span class="side-label back" data-button="3" aria-hidden="true">Назад</span><span class="wheel-arrow up" aria-hidden="true">↑</span><span class="wheel-arrow down" aria-hidden="true">↓</span></div>`;
   this.setAttribute('role','img');
   this.setAttribute('aria-label','Мышь RemTeh: основные и боковые кнопки со стрелками, направление прокрутки');
  }
  this.update();
  const selector=this.getAttribute('zone'),zone=selector?document.querySelector(selector):null;
  if(!zone)return;
  const listen=(target,event,handler,options)=>{
   target.addEventListener(event,handler,options);
   this.cleanups.push(()=>target.removeEventListener(event,handler,options));
  };
  const refresh=()=>this.setAttribute('pressed',[...this.downs].join(','));
  const clear=()=>{this.downs.clear();refresh();this.hideScroll();};
  let kind='mouse';
  listen(zone,'pointerdown',event=>{kind=event.pointerType;});
  listen(zone,'mousedown',event=>{if(kind!=='mouse')return;this.downs.add(event.button);refresh();});
  listen(window,'mouseup',event=>{this.downs.delete(event.button);refresh();});
  listen(window,'blur',clear);
  listen(document,'visibilitychange',()=>{if(document.hidden)clear();});
  listen(zone,'wheel',event=>this.showScroll(event.deltaY),{passive:true});
  const reset=document.getElementById('reset-all');
  if(reset)listen(reset,'click',clear);
 }
 showScroll(delta){
  if(!Number.isFinite(delta)||delta===0)return;
  const direction=delta<0?'up':'down';
  clearTimeout(this.wheelTimer);
  this.setAttribute('scroll-direction',direction);
  this.shadowRoot.querySelectorAll('.wheel-arrow').forEach(arrow=>arrow.classList.toggle('on',arrow.classList.contains(direction)));
  this.wheelTimer=setTimeout(()=>this.hideScroll(),420);
 }
 hideScroll(){
  clearTimeout(this.wheelTimer);
  this.removeAttribute('scroll-direction');
  this.shadowRoot.querySelectorAll('.wheel-arrow').forEach(arrow=>arrow.classList.remove('on'));
 }
 attributeChangedCallback(){this.update();}
 update(){
  const src=this.getAttribute('src')||'',pressed=new Set((this.getAttribute('pressed')||'').split(','));
  this.shadowRoot?.querySelectorAll('img.base,img.layer,img.press-well').forEach(img=>{
   if(img.getAttribute('src')!==src)img.setAttribute('src',src);
  });
  this.shadowRoot?.querySelectorAll('[data-button]').forEach(part=>part.classList.toggle('on',pressed.has(part.dataset.button)));
 }
 disconnectedCallback(){
  this.cleanups.forEach(stop=>stop());this.cleanups=[];this.downs.clear();
  this.setAttribute('pressed','');this.hideScroll();
 }
}
if(!customElements.get('remteh-mouse'))customElements.define('remteh-mouse',RemtehMouse);
