import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import assert from 'node:assert/strict';

const root=process.cwd(),directory=path.join(root,'dist/site'),out=process.env.QA_DIR||path.join(os.tmpdir(),'remteh-mouse-offline-evidence');
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'remteh-mouse-offline-'));
let generation=1,context;
const errors=[],requests=[];
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  requests.push(url.pathname);
  if(!url.pathname.startsWith('/Mouse-Tester/'))return response.writeHead(404).end();
  const name=decodeURIComponent(url.pathname.slice('/Mouse-Tester/'.length))||'index.html';
  const file=path.resolve(directory,name);
  if(!file.startsWith(directory+path.sep))return response.writeHead(403).end();
  try{
    let data=fs.readFileSync(file);
    if(name==='sw.js')data=Buffer.from(data.toString().replace(/remteh-mouse-[a-f0-9]{16}/,`remteh-mouse-${String(generation).padStart(16,'0')}`));
    if(name==='index.html')data=Buffer.from(data.toString().replace('<body>','<body data-test-build="'+generation+'">'));
    response.setHeader('Cache-Control','no-store');response.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(name)]||'application/octet-stream');response.end(data);
  }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/Mouse-Tester/';
async function launch(){
  context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1440,height:1000},...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  return context;
}
try{
  await launch();let page=await context.newPage();await page.goto(base);
  await page.getByText('Готово к запуску без сети',{exact:true}).waitFor();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.getByLabel('Устройство',{exact:true}).fill('Offline QA mouse');
  const pad=()=>page.getByRole('region',{name:'Панель измерений'});
  for(let i=0;i<3;i++)await pad().click();
  await page.waitForFunction(()=>document.querySelector('dd')?.textContent==='3');
  await page.goto('about:blank');await context.close();context=null;
  await launch();await context.setOffline(true);page=await context.newPage();
  await page.goto(base+'#buttons');await page.getByRole('heading',{name:'Mouse Tester',exact:true}).waitFor();
  assert.equal(await page.locator('dd').first().innerText(),'3');
  assert.equal(await page.getByLabel('Устройство',{exact:true}).inputValue(),'Offline QA mouse');
  await pad().click();await page.waitForFunction(()=>document.querySelector('dd')?.textContent==='4');
  await page.screenshot({path:path.join(out,'cold-start-offline.png'),fullPage:true});
  await context.setOffline(false);
  const second=await context.newPage();await second.goto(base+'#buttons');
  assert.equal(await second.locator('dd').first().innerText(),'0');
  await second.getByRole('region',{name:'Панель измерений'}).click();
  await second.getByRole('region',{name:'Панель измерений'}).click();
  await second.waitForFunction(()=>document.querySelector('dd')?.textContent==='2');
  generation=2;
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  const update=page.getByRole('button',{name:'Сохранить сессию и обновить',exact:true});await update.waitFor();
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};});
  await update.click();await page.getByRole('status').filter({hasText:'Текущая сессия остаётся открытой'}).waitFor();
  assert.equal(await page.locator('body').getAttribute('data-test-build'),'1');assert.equal(await page.locator('dd').first().innerText(),'4');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;delete window.originalSetItem;});
  await update.click();await page.waitForFunction(()=>document.body.dataset.testBuild==='2');
  assert.equal(await page.locator('dd').first().innerText(),'4');
  assert.equal(await page.getByLabel('Устройство',{exact:true}).inputValue(),'Offline QA mouse');
  const secondUpdate=second.getByRole('button',{name:'Сохранить сессию и обновить',exact:true});await secondUpdate.waitFor();
  assert.equal(await second.locator('dd').first().innerText(),'2');
  await secondUpdate.click();await second.waitForFunction(()=>document.body.dataset.testBuild==='2');
  assert.equal(await second.locator('dd').first().innerText(),'2');
  const history=await second.evaluate(()=>JSON.parse(localStorage.getItem('remteh-mouse-history-v1')));
  assert(history.some(row=>row.summary.totalClicks===4));assert(history.some(row=>row.summary.totalClicks===2));
  const caches=await page.evaluate(()=>caches.keys());assert(caches.includes('remteh-mouse-0000000000000001'));assert(caches.includes('remteh-mouse-0000000000000002'));
  assert(!requests.some(url=>url.includes('/api/')));assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,scenarios:['fresh-browser-cold-start-offline','restored-measurements-and-device','continue-test-offline','storage-failure-refuses-reload','explicit-update-preserves-session','other-tab-stays-active-and-updates-safely','history-merged-across-tabs','previous-cache-retained','no-AI-or-private-response-cache'],errors},null,2));
  console.log('Offline restart, guarded updates and two-tab preservation passed');
}finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
