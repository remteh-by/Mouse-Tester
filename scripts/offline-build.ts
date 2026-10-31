import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {Plugin} from 'vite';

export function offlineBuild():Plugin {
  return {name:'offline-app-shell',generateBundle(_options,bundle){
    const base='/Mouse-Tester/';
    const publicFiles=fs.readdirSync('public',{recursive:true}).map(String).filter(name=>fs.statSync(path.join('public',name)).isFile()).sort();
    const files=[...new Set(['index.html',...Object.keys(bundle),...publicFiles,'manifest.webmanifest'])];
    const digest=createHash('sha256');
    for(const name of Object.keys(bundle).sort()){const item=bundle[name];digest.update(name);digest.update(item.type==='chunk'?item.code:item.source);}
    for(const name of publicFiles)digest.update(fs.readFileSync(path.join('public',name)));
    for(const name of ['index.html','vite.config.ts','scripts/offline-build.ts'])digest.update(fs.readFileSync(name));
    const cache='remteh-mouse-'+digest.digest('hex').slice(0,16);
    this.emitFile({type:'asset',fileName:'manifest.webmanifest',source:JSON.stringify({id:base,name:'RemTeh Mouse Tester',short_name:'Mouse Tester',start_url:base,scope:base,display:'standalone',background_color:'#10171b',theme_color:'#10171b',lang:'ru',icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'}]})});
    this.emitFile({type:'asset',fileName:'sw.js',source:`const CACHE=${JSON.stringify(cache)},BASE=${JSON.stringify(base)},FILES=${JSON.stringify(files.map(name=>base+name))};
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES);if(!self.registration.active)await self.skipWaiting();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const meta=await caches.open('remteh-mouse-state');const marker=BASE+'__active-cache';const prior=await meta.match(marker);const previous=prior?await prior.text():null;const names=(await caches.keys()).filter(name=>/^remteh-mouse-[a-f0-9]{16}$/.test(name));for(const name of names)if(name!==CACHE&&name!==previous)await caches.delete(name);await meta.put(marker,new Response(CACHE));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE)||url.pathname.includes('/api/'))return;
if(event.request.mode==='navigate'&&(url.pathname===BASE||url.pathname===BASE+'index.html')){event.respondWith(caches.open(CACHE).then(cache=>cache.match(BASE+'index.html')).then(hit=>hit||fetch(event.request)));return;}
if(!FILES.includes(url.pathname))return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||fetch(event.request)));});`});
  }};
}
