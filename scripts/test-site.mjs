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
  let imageURL,logoURL;
  for(const width of [390,1920,2560,3840]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Mouse Tester',exact:true}).waitFor();
    await page.locator('remteh-mouse img.base').evaluate(image=>image.decode());
    await page.locator('remteh-mouse img.brand').evaluate(image=>image.decode());
    const state=await page.evaluate(()=>{
      const mouse=document.querySelector('remteh-mouse');
      const image=mouse.shadowRoot.querySelector('img.base');
      return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
        shellWidth:document.querySelector('.lab-shell').getBoundingClientRect().width,
        indicatorOverflow:[...document.querySelectorAll('.button-indicators span')].some(node=>node.scrollWidth>node.clientWidth),
        imageURL:image.currentSrc,imageWidth:image.naturalWidth,
        logoURL:mouse.shadowRoot.querySelector('img.brand').currentSrc,logoWidth:mouse.shadowRoot.querySelector('img.brand').naturalWidth,
        sideControlsFit:[...mouse.shadowRoot.querySelectorAll('.side-label,.side-title,.side-key,.press-arrow')].every(part=>part.getBoundingClientRect().right<=mouse.getBoundingClientRect().right+1&&part.getBoundingClientRect().left>=mouse.getBoundingClientRect().left-1),
        policy:!!document.querySelector('meta[http-equiv="Content-Security-Policy"]')};
    });
    assert.equal(state.overflow,false);assert.equal(state.indicatorOverflow,false);assert.equal(state.imageWidth,800);assert.equal(state.logoWidth,161);assert(state.policy);assert(state.sideControlsFit);
    if(width>=1920)assert(state.shellWidth>width*.9);
    assert(new URL(state.imageURL).pathname.startsWith(prefix));
    imageURL=state.imageURL;logoURL=state.logoURL;
    if(width===390||width===1920)await page.screenshot({path:path.join(out,'mouse-site-'+width+'.png'),fullPage:true});
    results.push(state);
  }
  const image=await page.request.get(imageURL);assert.equal(image.status(),200);
  const hash=data=>createHash('sha256').update(data).digest('hex');
  const expected=hash(fs.readFileSync(path.join(root,'public/devices/remteh-mouse.webp')));
  assert.equal(hash(await image.body()),expected);
  const logo=await page.request.get(logoURL);assert.equal(logo.status(),200);
  assert.equal(hash(await logo.body()),hash(fs.readFileSync(path.join(root,'shared/remteh-logo-white.png'))));
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('Источник ввода').selectOption('mouse');
  const pad=page.getByRole('region',{name:'Панель измерений'});
  const sheen=page.locator('remteh-mouse .brand-sheen');
  const logoPhases=[];
  for(const time of [0,1750]){
    await sheen.evaluate((element,time)=>{for(const animation of element.getAnimations()){animation.pause();animation.currentTime=time;}},time);
    logoPhases.push(hash(await page.locator('remteh-mouse .brand-engraving').screenshot({path:path.join(out,'engraving-'+time+'.png')})));
  }
  assert.notEqual(logoPhases[0],logoPhases[1]);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await sheen.evaluate(element=>getComputedStyle(element).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await pad.hover();
  await page.locator('remteh-mouse').screenshot({path:path.join(out,'mouse-close-rest.png')});
  try {
    await page.mouse.down({button:'left'});await page.mouse.down({button:'right'});
    await page.waitForFunction(()=>[...document.querySelector('remteh-mouse').shadowRoot.querySelectorAll('.layer.on')].length===2);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('remteh-mouse').shadowRoot.querySelector('.layer.left')).transform!=='none');
    await page.locator('remteh-mouse .layer.left').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
    const pressedStyle=await page.locator('remteh-mouse .layer.left').evaluate(element=>({transform:getComputedStyle(element).transform,filter:getComputedStyle(element).filter}));
    assert.notEqual(pressedStyle.transform,'none');assert(!/hue-rotate|sepia/.test(pressedStyle.filter));
    assert.equal(await page.locator('remteh-mouse .press-well.on').count(),2);
    assert.equal(await page.locator('remteh-mouse .press-arrow.main-left.on').count(),1);
    assert.equal(await page.locator('remteh-mouse .press-arrow.main-right.on').count(),1);
    const activeColors=await page.locator('[data-pressed="true"]').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).backgroundColor.match(/[0-9.]+/g).slice(0,3).map(Number)));
    assert(activeColors.every(rgb=>Math.max(...rgb)-Math.min(...rgb)<32));
    assert.equal(await page.locator('[data-pressed="true"]').count(),2);
    await page.screenshot({path:path.join(out,'mouse-site-pressed.png'),fullPage:true});
    await page.locator('remteh-mouse').screenshot({path:path.join(out,'mouse-close-pressed.png')});
  } finally {await page.mouse.up({button:'right'});await page.mouse.up({button:'left'});}
  await page.waitForFunction(()=>document.querySelector('remteh-mouse').shadowRoot.querySelectorAll('.layer.on').length===0);
  await pad.hover();
  try {
    await page.mouse.down({button:'middle'});
    await page.waitForFunction(()=>document.querySelector('remteh-mouse').shadowRoot.querySelector('.layer.wheel.on'));
    await page.locator('remteh-mouse .layer.wheel').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
    const middle=await page.locator('remteh-mouse .layer.wheel').evaluate(element=>{
      const transform=new DOMMatrix(getComputedStyle(element).transform);
      return {scaleX:transform.a,scaleY:transform.d,shiftX:transform.e,shiftY:transform.f,clip:getComputedStyle(element).clipPath,baseTransform:getComputedStyle(element.getRootNode().querySelector('img.base')).transform};
    });
    assert.equal(middle.scaleX,1);assert.equal(middle.scaleY,1);assert.equal(middle.shiftX,0);assert(middle.shiftY>0&&middle.shiftY<2);
    assert(middle.clip.includes('16.1%'));assert.equal(middle.baseTransform,'none');
    assert.equal(await page.locator('remteh-mouse .press-arrow.middle.on').count(),1);
    await page.locator('remteh-mouse').screenshot({path:path.join(out,'mouse-close-middle.png')});
  } finally {await page.mouse.up({button:'middle'});}
  const cdp=await page.context().newCDPSession(page);
  for(const [button,index] of [['back',3],['forward',4]]){
    await pad.hover();const rect=await pad.boundingBox();const point={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
    const before=page.url();
    try {
      await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button,buttons:button==='back'?8:16,clickCount:1,...point});
      await page.waitForFunction(index=>document.querySelector('remteh-mouse').getAttribute('pressed').split(',').includes(String(index)),index);
      const cap=page.locator('remteh-mouse .side-key.'+button+'.on .side-cap');
      await cap.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
      assert.notEqual(await cap.evaluate(element=>getComputedStyle(element).transform),'none');
      assert.equal(await page.locator('remteh-mouse .press-arrow.side-'+button+'.on').count(),1);
      await page.locator('remteh-mouse').screenshot({path:path.join(out,'mouse-close-'+button+'.png')});
    } finally {await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button,buttons:0,clickCount:1,...point});}
    assert.equal(page.url(),before);
  }
  await cdp.detach();
  await page.waitForFunction(()=>document.querySelector('remteh-mouse').shadowRoot.querySelectorAll('.press-arrow.on,.side-key.on').length===0);
  await page.getByRole('button',{name:'Колесо',exact:true}).click();await pad.hover();
  assert.equal(new URL(page.url()).hash,'#wheel');
  for(const [delta,direction,other] of [[-120,'up','down'],[120,'down','up']]){
    await page.mouse.wheel(0,delta);
    await page.waitForFunction(direction=>document.querySelector('remteh-mouse').getAttribute('scroll-direction')===direction,direction);
    assert.equal(await page.locator('remteh-mouse .wheel-arrow.'+other+'.on').count(),0);
    await page.locator('remteh-mouse .wheel-arrow.'+direction).evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
    await page.screenshot({path:path.join(out,'mouse-site-wheel-'+direction+'.png'),fullPage:true});
    await page.locator('remteh-mouse').screenshot({path:path.join(out,'mouse-close-wheel-'+direction+'.png')});
  }
  await page.waitForFunction(()=>!document.querySelector('remteh-mouse').hasAttribute('scroll-direction'));
  await page.getByRole('button',{name:'ИИ-помощник',exact:true}).click();
  await page.getByText('В онлайн-версии ИИ-помощник не подключён.',{exact:false}).waitFor();
  assert.equal(await page.getByLabel('Код доступа оператора').count(),0);
  await page.getByRole('button',{name:'Отчёт',exact:true}).click();
  await page.getByRole('button',{name:'Сохранить сессию',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Сессия сохранена'}).waitFor();
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт JSON',exact:true}).click();
  const download=await downloadEvent;await download.saveAs(path.join(out,'site-session.json'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'site-session.json'),'utf8')).summary.totalClicks,5);
  assert((await page.getByRole('link',{name:'Поддержать на Ko-fi ↗',exact:true}).getAttribute('href')).startsWith('https://ko-fi.com/pavelzayats'));
  for(const [id,title] of [['buttons','Кнопки'],['wheel','Колесо'],['movement','Движение'],['sensor','Рисование'],['report','Отчёт']]){
    await page.evaluate(id=>{location.hash=id;},id);
    await page.locator('nav.tabs button[aria-current="page"]').filter({hasText:title}).waitFor();
    assert.equal(await page.locator('dd').first().innerText(),'5');
  }
  const deep=await browser.newPage();
  await deep.goto(base+'#sensor',{waitUntil:'networkidle'});
  assert.equal(await deep.locator('nav.tabs button[aria-current="page"]').innerText(),'Рисование');
  await deep.close();
  assert.deepEqual(api,[]);assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
  results.push({passed:true,base,mouseSHA256:expected,logoPhases,scenarios:['static-subpath-assets','same-mouse-bytes','neutral-physical-button-depression','two-held-buttons-and-release','middle-wheel-no-scaling-rigid-housing','native-back-forward-buttons-and-left-arrows','wheel-up-and-down-arrows','official-logo-engraving-shimmer-and-reduced-motion','deep-links-preserve-session','AI-unavailable-without-API-requests','history-and-JSON-export','support-link'],apiRequests:api.length,errors,failed});
  await page.close();
} finally {
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'site-results.json'),JSON.stringify(results,null,2));
}
console.log('Static Mouse Tester site passed: 390/1920/2560/3840, matching mouse and live controls');
