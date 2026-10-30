const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({downloadsPath:require('path').resolve(__dirname,'../test-results/downloads'),...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const context=await browser.newContext(),a=await context.newPage(),b=await context.newPage();
  for(const p of [a,b]){p.on('dialog',d=>d.accept());await require('./downloads.cjs').capture(p);await p.goto('http://127.0.0.1:8765/');await p.locator('#try-local').click();}
  // Hold the commit lock so both tabs edit the same base before either can commit.
  await a.evaluate(()=>{window.releaseLock=null;navigator.locks.request('meu-ritmo-v1',()=>new Promise(resolve=>window.releaseLock=resolve));});
  await a.waitForFunction(()=>typeof window.releaseLock==='function');
  await a.locator('#task-input').fill('Edição da primeira aba');await a.locator('#task-input').press('Enter');
  await b.locator('#task-input').fill('Edição da segunda aba');await b.locator('#task-input').press('Enter');
  await a.evaluate(()=>window.releaseLock());
  await b.waitForFunction(()=>!document.getElementById('local-recovery').hidden);
  const raw=await a.evaluate(()=>localStorage.getItem('meu-ritmo-v1'));assert.match(raw,/primeira aba/);assert.doesNotMatch(raw,/segunda aba/);
  await b.reload();await b.locator('#try-local').click();assert(await b.locator('#local-recovery').isVisible());
  const download=b.waitForEvent('download');await b.locator('#local-export').click();const file=await download;const fs=require('node:fs');assert.match(await require('./downloads.cjs').text(b,file),/segunda aba/);
  await b.locator('#local-recover').click();await b.waitForFunction(()=>document.querySelector('#tasks').textContent.includes('segunda aba'));
  await a.waitForFunction(()=>document.querySelector('#tasks').textContent.includes('segunda aba'));
  await a.getByRole('button',{name:'Editar Edição da segunda aba',exact:true}).click();await a.locator('#edit-text').fill('Edição ainda aberta');await b.locator('#task-input').fill('Outra alteração');await b.locator('#task-input').press('Enter');await a.waitForFunction(()=>document.querySelector('#message').textContent.includes('Outra aba salvou'));assert.equal(await a.locator('#edit-text').inputValue(),'Edição ainda aberta');await a.getByRole('button',{name:'Salvar alterações',exact:true}).click();await a.waitForFunction(()=>!document.querySelector('#local-recovery').hidden);assert.doesNotMatch(await b.evaluate(()=>localStorage.getItem('meu-ritmo-v1')),/Edição ainda aberta/);
  // Oversized imports leave the existing data intact, including UTF-8 content.
  const large={notes:'',tasks:Array.from({length:500},(_,i)=>({id:String(i),text:'Á'.repeat(200),done:false,subtasks:Array.from({length:30},(_,j)=>({id:String(j),text:'界'.repeat(120),done:false}))}))};
  const size=await b.evaluate(data=>({valid:valid(data),fits:meuRitmoDataFits(data)}),large);assert(size.valid);assert(!size.fits);
  const medium={...large,tasks:large.tasks.slice(0,200)};
  await b.locator('#file').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(medium))});
  await b.waitForFunction(()=>document.querySelector('#message').textContent.includes('limite seguro'));assert.match(await b.locator('#tasks').innerText(),/segunda aba/);
  const result=await b.evaluate(()=>{
   const task=(id,text)=>({id,text,done:false});const base={tasks:[task('a','A'),task('b','B')],notes:'',sessions:[],trash:[]};
   const local=structuredClone(base),remote=structuredClone(base);local.tasks[0].text='A local';remote.tasks[1].text='B remota';
   const independent=meuRitmoMerge(base,local,remote);remote.tasks[0].text='A remota';const collision=meuRitmoMerge(base,local,remote);
   const missing=meuRitmoMerge(null,local,remote);return {independent,collision,missing};
  });
  assert.equal(result.independent.merged.tasks[0].text,'A local');assert.equal(result.independent.merged.tasks[1].text,'B remota');assert.equal(result.collision.merged,null);assert.equal(result.missing.merged,null);
  // Basic disclosure flow stays keyboard-accessible, including mobile layout.
  await b.setViewportSize({width:375,height:812});assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await b.locator('#task-extra > summary').click();assert(await b.locator('#task-due').isVisible());
  await context.close();console.log('PASS: concurrent local edits, durable recovery/export, UTF-8 size guard, conservative merge and compact mobile UI.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
