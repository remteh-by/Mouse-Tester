import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),kind='mouse',out=path.resolve(process.env.QA_DIR||root+'/output/support');fs.mkdirSync(out,{recursive:true});
const require=createRequire(root+'/package.json'),{chromium}=require('playwright');
const registry=JSON.parse(fs.readFileSync(root+'/support/registry.json','utf8'));
const directory=root+(kind==='xplay'?'/dist':'/dist/site'),prefix=kind==='mouse'?'/Mouse-Tester/':'/';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();
 let name=decodeURIComponent(url.pathname.slice(prefix.length));if(!name||name.endsWith('/'))name+='index.html';
 const file=path.resolve(directory,name);if(!file.startsWith(directory+'/'))return res.writeHead(403).end();
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+prefix;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),results=[];
try{
 for(const width of [390,1920,2560,3840]){
  const context=await browser.newContext({viewport:{width,height:1100},locale:'en-US'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.__copied=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.__denyCopy)throw new Error('Denied');window.__copied=text;}}});});
  await page.goto(base);await page.locator(kind==='mouse'?'.support-compact .support-trigger':'.app-footer button').click();
  const dialog=page.getByRole('dialog'),select=dialog.getByRole('combobox');assert.equal(await select.locator('option').count(),6);
  for(const method of registry.methods){
   await select.selectOption(method.id);
   assert.equal(await dialog.locator('.support-destination').innerText(),method.url);
   assert.equal(await dialog.locator('.support-actions a').getAttribute('href'),method.url);
   await dialog.locator('.support-actions button').click();assert.equal(await page.evaluate(()=>window.__copied),method.url);
   await dialog.locator('summary').click();await dialog.locator('img').evaluate(img=>img.decode());
   assert.equal(await dialog.locator('img').getAttribute('src'),(kind==='mouse'?'/Mouse-Tester/':'./')+'assets/support/'+method.id+'.svg');
   assert(await dialog.locator('.support-readiness').innerText());
   await dialog.locator('summary').click();
  }
  await page.evaluate(()=>window.__denyCopy=true);await dialog.locator('.support-actions button').click();
  assert.equal(await dialog.getByRole('status').innerText(),registry.texts[kind==='mouse'?'ru':'en'].support_copy_failed);
  await dialog.locator('summary').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.deepEqual(errors,[]);
  if(width===390||width===1920)await page.screenshot({path:out+'/'+kind+'-support-'+width+'.png'});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.reload();await page.locator(kind==='mouse'?'.support-compact .support-trigger':'.app-footer button').click();
  assert.equal(await page.getByRole('dialog').getByRole('combobox').inputValue(),'okx_pay');
  results.push({width,methods:6,exactDestinations:true,clipboard:true,clipboardFailure:true,qrImages:true,persistence:true,overflow:false,errors});
  await context.close();
 }
 // Optional preferences failing must not prevent the donation selection.
 const context=await browser.newContext(),page=await context.newPage();
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('Storage full');};});await page.goto(base);
 await page.locator(kind==='mouse'?'.support-compact .support-trigger':'.app-footer button').click();
 await page.getByRole('dialog').getByRole('combobox').selectOption('donatepay');
 assert.equal(await page.locator('.support-actions a').filter({visible:true}).getAttribute('href'),'https://donatepay.ru/don/1541009');
 await context.close();results.push({storageFailure:'selection remains usable'});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(out+'/support-results.json',JSON.stringify(results,null,2));}
console.log(kind+': six correct destinations, copy/failure, QR, choice persistence, denied storage and four widths passed');
