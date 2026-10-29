const {chromium}=require('playwright');
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ritmo-update-'));
 const files=['index.html','app.js','cloud.js','cloud-config.js','pwa.js','sw.js','manifest.webmanifest','assets','vendor'];
 for(const file of files)fs.cpSync(path.join(root,file),path.join(temp,file),{recursive:true});
 // Fixture: a previous shell with new markup but a cached script without the check handler.
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(app|cloud|pwa)\.js\?v=7/g,'$1.js');
 let worker=fs.readFileSync(path.join(root,'sw.js'),'utf8').replace('meu-ritmo-shell-v7','meu-ritmo-shell-old-fixture').replace(/(app|cloud|pwa)\.js\?v=7/g,'$1.js');
 fs.writeFileSync(path.join(temp,'index.html'),html);fs.writeFileSync(path.join(temp,'sw.js'),worker);fs.writeFileSync(path.join(temp,'pwa.js'),"navigator.serviceWorker.register('./sw.js');");
 const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1','--directory',temp],{stdio:'ignore'});
 let browser;
 try{
  let responding=false;for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:8767/');if(r.ok){responding=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(responding);
  browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const context=await browser.newContext(),page=await context.newPage();
  await page.goto('http://127.0.0.1:8767/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.locator('#try-local').click();await page.locator('#task-input').fill('Não apagar meus dados');await page.locator('#task-input').press('Enter');
  await page.locator('#check-update').click();assert(await page.locator('#update-notice').isHidden());
  for(const file of files)fs.cpSync(path.join(root,file),path.join(temp,file),{recursive:true});
  await page.goto('http://127.0.0.1:8767/?atualizar=7');await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  await page.locator('#check-update').click();assert(await page.locator('#apply-update').isVisible());assert.match(await page.locator('#update-text').innerText(),/nova versão/);
  await page.locator('#try-local').click();assert.match(await page.locator('#tasks').innerText(),/Não apagar/);
  await page.evaluate(()=>window.meuRitmoCanUpdate=()=>false);await page.locator('#apply-update').click();assert.match(await page.locator('#update-text').innerText(),/pendentes/);
  await page.evaluate(()=>window.meuRitmoCanUpdate=()=>true);await page.locator('#apply-update').click();await page.waitForFunction(()=>!document.querySelector('#send-code').disabled);await page.locator('#try-local').click();assert.match(await page.locator('#tasks').innerText(),/Não apagar/);assert(await page.evaluate(async()=>{const keys=await caches.keys();return keys.includes('meu-ritmo-shell-v7')&&!keys.includes('meu-ritmo-shell-old-fixture');}));
  await context.setOffline(true);await page.reload();await page.locator('#try-local').click();assert.match(await page.locator('#tasks').innerText(),/Não apagar/);await context.close();
  // Check immediate feedback and a bounded wait when the update API stalls.
  const mocked=await browser.newContext();await mocked.addInitScript(()=>{const reg={waiting:null,installing:null,update:()=>new Promise(resolve=>{window.finishUpdate=resolve;}),addEventListener(){}};Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{controller:null,register:async()=>reg,addEventListener(){}}});});
  const stalled=await mocked.newPage();await stalled.clock.install();await stalled.goto('http://127.0.0.1:8767/');await stalled.locator('#check-update').click();assert.equal(await stalled.locator('#check-update').innerText(),'Verificando…');assert(await stalled.locator('#check-update').isDisabled());assert.match(await stalled.locator('#update-text').innerText(),/Verificando/);
  await stalled.clock.fastForward(12001);await stalled.waitForFunction(()=>!document.querySelector('#check-update').disabled);assert.match(await stalled.locator('#update-text').innerText(),/demorou/);assert.equal(await stalled.locator('#check-update').getAttribute('aria-busy'),null);await mocked.close();
  console.log('PASS: reproduz cache misturado, migra para scripts versionados, atualiza preservando tarefas, bloqueia pendências, reabre offline e mostra progresso/timeout.');
 }finally{if(browser)await browser.close();server.kill();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
