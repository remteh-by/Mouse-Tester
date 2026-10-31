import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'dist/site');
const prefix='/Mouse-Tester/';
const out=process.env.QA_DIR||path.join(root,'output/site');
fs.mkdirSync(out,{recursive:true});
let server,browser;
const results=[],errors=[],failed=[],api=[];
try {
  let base=process.env.SITE_URL;
  if(!base) {
    server=http.createServer((req,res)=>{
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(!pathname.startsWith(prefix))return res.writeHead(404).end();
      const relative=decodeURIComponent(pathname.slice(prefix.length))||'index.html';
      const file=path.resolve(directory,relative);
      if(!file.startsWith(directory+path.sep))return res.writeHead(403).end();
      const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
      try {
        res.setHeader('Content-Type',type[path.extname(file)]||'application/octet-stream');
        res.end(fs.readFileSync(file));
      } catch {res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    base='http://127.0.0.1:'+server.address().port+prefix;
  }
  assert.equal(new URL(base).pathname,prefix);
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(new URL(request.url()).pathname.includes('/api/'))api.push(request.url());});
  page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
  let imageURL;
  for(const width of [390,1920,2560,3840]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Mouse Tester',exact:true}).waitFor();
    await page.locator('remteh-mouse img.base').evaluate(image=>image.decode());
    const state=await page.evaluate(()=>{
      const mouse=document.querySelector('remteh-mouse');
      const image=mouse.shadowRoot.querySelector('img.base');
      return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
        shellWidth:document.querySelector('.lab-shell').getBoundingClientRect().width,
        indicatorOverflow:[...document.querySelectorAll('.button-indicators span')].some(node=>node.scrollWidth>node.clientWidth),
        imageURL:image.currentSrc,imageWidth:image.naturalWidth,
        policy:!!document.querySelector('meta[http-equiv="Content-Security-Policy"]')};
    });
    assert.equal(state.overflow,false);assert.equal(state.indicatorOverflow,false);assert.equal(state.imageWidth,800);assert(state.policy);
    if(width>=1920)assert(state.shellWidth>width*.9);
    assert(new URL(state.imageURL).pathname.startsWith(prefix));
    imageURL=state.imageURL;
    if(width===390||width===1920)await page.screenshot({path:path.join(out,'mouse-site-'+width+'.png'),fullPage:true});
    results.push(state);
  }
  const image=await page.request.get(imageURL);assert.equal(image.status(),200);
  const hash=data=>createHash('sha256').update(data).digest('hex');
  const expected=hash(fs.readFileSync(path.join(root,'public/devices/remteh-mouse.webp')));
  assert.equal(hash(await image.body()),expected);
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('Источник ввода').selectOption('mouse');
  const pad=page.getByRole('region',{name:'Панель измерений'});
  await pad.hover();
  try {
    await page.mouse.down({button:'left'});await page.mouse.down({button:'right'});
    await page.waitForFunction(()=>[...document.querySelector('remteh-mouse').shadowRoot.querySelectorAll('.layer.on')].length===2);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('remteh-mouse').shadowRoot.querySelector('.layer.left')).opacity==='1');
    assert.equal(await page.locator('[data-pressed="true"]').count(),2);
    await page.screenshot({path:path.join(out,'mouse-site-pressed.png'),fullPage:true});
  } finally {await page.mouse.up({button:'right'});await page.mouse.up({button:'left'});}
  await page.waitForFunction(()=>document.querySelector('remteh-mouse').shadowRoot.querySelectorAll('.layer.on').length===0);
  await page.getByRole('button',{name:'Колесо',exact:true}).click();await pad.hover();await page.mouse.wheel(0,120);
  await page.waitForFunction(()=>document.querySelector('remteh-mouse').shadowRoot.querySelector('.wheel-signal').classList.contains('on'));
  await page.getByRole('button',{name:'ИИ-помощник',exact:true}).click();
  await page.getByText('В онлайн-версии ИИ-помощник не подключён.',{exact:false}).waitFor();
  assert.equal(await page.getByLabel('Код доступа оператора').count(),0);
  await page.getByRole('button',{name:'Отчёт',exact:true}).click();
  await page.getByRole('button',{name:'Сохранить сессию',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Сессия сохранена'}).waitFor();
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт JSON',exact:true}).click();
  const download=await downloadEvent;await download.saveAs(path.join(out,'site-session.json'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'site-session.json'),'utf8')).summary.totalClicks,2);
  assert((await page.getByRole('link',{name:'Поддержать на Ko-fi ↗',exact:true}).getAttribute('href')).startsWith('https://ko-fi.com/pavelzayats'));
  assert.deepEqual(api,[]);assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
  results.push({passed:true,base,mouseSHA256:expected,scenarios:['static-subpath-assets','same-mouse-bytes','two-held-buttons-and-release','wheel-feedback','AI-unavailable-without-API-requests','history-and-JSON-export','support-link'],apiRequests:api.length,errors,failed});
  await page.close();
} finally {
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'site-results.json'),JSON.stringify(results,null,2));
}
console.log('Static Mouse Tester site passed: 390/1920/2560/3840, matching mouse and live controls');
