import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';
import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.QA_DIR||path.join(root,'output/browser');fs.mkdirSync(out,{recursive:true});
const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base='http://127.0.0.1:'+port,results=[],temporary=fs.mkdtempSync(path.join(os.tmpdir(),'mouse-qa-'));
const child=spawn(process.execPath,['dist/server/server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),AI_ENABLED:'false',GEMINI_API_KEY:'',AI_ACCESS_TOKEN:'',DATA_DIR:temporary},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error('Production server exited');try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw new Error('Server did not start');await new Promise(resolve=>setTimeout(resolve,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [360,390,414,1440,1920,2560,3840]){
  await page.setViewportSize({width,height:1000});await page.goto(base);await page.getByRole('heading',{name:'Mouse Tester',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(width===390||width===1920)await page.screenshot({path:out+'/mouse-'+width+'.png',fullPage:true});results.push({app:'mouse',width,overflow:false});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel('Источник ввода').selectOption('mouse');
 await page.getByRole('combobox',{name:'Сценарий'}).selectOption('single');
 await page.getByRole('region',{name:'Панель измерений'}).click();await page.waitForTimeout(250);
 assert.equal(await page.locator('dd').first().innerText(),'1');
 await page.getByRole('button',{name:'Отчёт',exact:true}).click();await page.getByRole('button',{name:'Сохранить сессию',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('remteh-mouse-history-v1'))[0]);assert.equal(saved.summary.totalClicks,1);assert.equal(saved.summary.eventRateHz,null);
 await page.getByRole('button',{name:'Кнопки',exact:true}).click();assert.equal(await page.locator('dd').first().innerText(),'1');
 await page.getByRole('button',{name:'Отчёт',exact:true}).click();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт JSON'}).click();const download=await downloadEvent;await download.saveAs(out+'/mouse-session.json');
 assert.equal(JSON.parse(fs.readFileSync(out+'/mouse-session.json','utf8')).summary.totalClicks,1);
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema":999}')});await page.waitForTimeout(100);assert.equal(await page.locator('dd').first().innerText(),'1');
 await page.context().setOffline(true);await page.getByRole('button',{name:'Кнопки',exact:true}).click();await page.getByRole('region',{name:'Панель измерений'}).click();await page.waitForTimeout(250);assert.equal(await page.locator('dd').first().innerText(),'2');await page.context().setOffline(false);
 assert.deepEqual(errors,[]);results.push({app:'mouse',scenarios:['session-across-tabs','local-history','export','invalid-import-preserves','offline-loaded-page'],passed:true});
 const response=await page.request.get(base+'/server/server.mjs');assert.equal(response.status(),404);assert.equal((await page.request.get(base+'/.env.local')).status(),404);
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError')};});
 await page.getByRole('button',{name:'Новая сессия',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Текущая сессия остаётся открытой'}).waitFor();
 assert.equal(await page.locator('dd').first().innerText(),'2');
 results.push({app:'mouse',scenario:'storage-failure-preserves-current-session',passed:true});
 await page.getByRole('region',{name:'Панель измерений'}).hover();
 await page.mouse.down({button:'left'});await page.mouse.down({button:'right'});
 await page.waitForTimeout(250);assert.equal(await page.locator('dd').first().innerText(),'4');
 assert.equal(await page.locator('[data-pressed="true"]').count(),2);
 await page.mouse.up({button:'right'});await page.mouse.up({button:'left'});
 await page.waitForTimeout(250);assert.equal(await page.locator('[data-pressed="true"]').count(),0);
 results.push({app:'mouse',scenario:'simultaneous-left-right-buttons-counted-and-released',passed:true});

 await page.close();
}finally{await browser?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}fs.rmSync(temporary,{recursive:true,force:true});fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
console.log('Mouse browser checks passed, including failed-storage preservation');
