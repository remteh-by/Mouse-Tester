/* Original RemTeh mouse illustration: visual state only, no diagnostic conclusions. */
const styleURL = new URL('./mouse-visual.css',import.meta.url).href;
export class RemtehMouse extends HTMLElement {
 static observedAttributes=['src','pressed'];
 constructor(){super();this.attachShadow({mode:'open'});this.downs=new Set();this.cleanups=[];}
 connectedCallback(){
  if(!this.shadowRoot.childNodes.length){
   this.shadowRoot.innerHTML=`<link rel="stylesheet" href="${styleURL}"><div class="art"><img class="base" alt="Уникальная мышь RemTeh" draggable="false"><img class="layer left" data-button="0" alt=""><img class="layer wheel" data-button="1" alt=""><img class="layer right" data-button="2" alt=""><img class="layer back" data-button="3" alt=""><img class="layer forward" data-button="4" alt=""><span class="wheel-signal"></span></div>`;
   this.setAttribute('role','img');this.setAttribute('aria-label','Уникальная мышь RemTeh; индикация реальных нажатий');
  }
  this.update();
  const selector=this.getAttribute('zone'),zone=selector?document.querySelector(selector):null;
  if(zone){
   const listen=(target,event,handler,options)=>{target.addEventListener(event,handler,options);this.cleanups.push(()=>target.removeEventListener(event,handler,options));};
   const refresh=()=>this.setAttribute('pressed',[...this.downs].join(','));
   const clear=()=>{this.downs.clear();refresh();};
   let kind='mouse';listen(zone,'pointerdown',event=>{kind=event.pointerType;});listen(zone,'mousedown',event=>{if(kind!=='mouse')return;this.downs.add(event.button);refresh();});
   listen(window,'mouseup',event=>{this.downs.delete(event.button);refresh();});
   listen(window,'blur',clear);listen(document,'visibilitychange',()=>{if(document.hidden)clear();});
   listen(zone,'wheel',()=>{const mark=this.shadowRoot.querySelector('.wheel-signal');mark.classList.remove('on');void mark.offsetWidth;mark.classList.add('on');clearTimeout(this.wheelTimer);this.wheelTimer=setTimeout(()=>mark.classList.remove('on'),220);},{passive:true});
   const reset=document.getElementById('reset-all');if(reset)listen(reset,'click',clear);
  }
 }
 attributeChangedCallback(){this.update();}
 update(){const src=this.getAttribute('src')||'',pressed=new Set((this.getAttribute('pressed')||'').split(','));this.shadowRoot?.querySelectorAll('img').forEach(img=>{if(img.getAttribute('src')!==src)img.setAttribute('src',src);if(img.dataset.button!==undefined)img.classList.toggle('on',pressed.has(img.dataset.button));});}
 disconnectedCallback(){this.cleanups.forEach(stop=>stop());this.cleanups=[];clearTimeout(this.wheelTimer);}
}
if(!customElements.get('remteh-mouse'))customElements.define('remteh-mouse',RemtehMouse);
