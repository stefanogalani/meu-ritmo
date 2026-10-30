const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({downloadsPath:path.resolve(__dirname,'../test-results/downloads'),...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const c=await browser.newContext(),user={id:'test-owner',email:'test@example.com'},errors=[];
  let revision=1,payload={tasks:[{id:'a',text:'A',done:false},{id:'b',text:'B',done:false}],notes:'',sessions:[],trash:[]};
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,exp:Math.floor(Date.now()/1000)+3600},'test'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
  await c.route('https://app.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html',body:fs.readFileSync(path.resolve(__dirname,'..',file))});});
  await c.route('https://*.supabase.co/**',async r=>{const url=new URL(r.request().url());let body={};if(url.pathname.endsWith('/user'))body=user;if(url.pathname.endsWith('/user_data'))body=[{revision,payload}];if(url.pathname.endsWith('/save_my_data')){const data=r.request().postDataJSON();if(data.expected_revision!==revision)return r.fulfill({status:409,json:{}});payload=data.document;body=++revision;}return r.fulfill({json:body});});
  async function page(){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto('https://app.test/#access_token='+jwt+'&refresh_token=r&expires_in=3600');await p.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Sincronizado'));return p;}
  const a=await page(),b=await page();
  await a.evaluate(()=>{state.tasks[0].text='A local';save();render();});await a.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Sincronizado às'));
  await b.evaluate(()=>{state.tasks[1].text='B local';save();render();});await b.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Conflito'));
  await b.locator('#compare-cloud').click();await b.locator('#compare-dialog').waitFor({state:'visible'});assert.match(await b.locator('#compare-summary').innerText(),/podem ser combinadas/);await b.locator('#compare-close').click();await b.locator('#merge-cloud').click();await b.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Sincronizado às'));
  assert.equal(payload.tasks[0].text,'A local');assert.equal(payload.tasks[1].text,'B local');
  // Clean tabs refresh when focus returns. No background polling or forced reload.
  await a.getByRole('button',{name:'Editar A local',exact:true}).click();await a.locator('#edit-text').fill('Rascunho ainda aberto');await a.evaluate(()=>window.dispatchEvent(new Event('focus')));await a.waitForTimeout(100);assert.equal(await a.locator('#edit-text').inputValue(),'Rascunho ainda aberto');assert.equal(await a.evaluate(()=>state.tasks.find(t=>t.id==='b').text),'B');await a.locator('#edit-cancel').click();
  await a.evaluate(()=>window.dispatchEvent(new Event('focus')));await a.waitForFunction(()=>state.tasks.some(task=>task.text==='B local'));
  // Two edits of the same notes field must not be merged automatically.
  const d=await page();await b.locator('#notes').fill('Notas B');await b.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Sincronizado às'));
  await d.locator('#notes').fill('Notas D');await d.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Conflito'));await d.locator('#compare-cloud').click();await d.locator('#compare-dialog').waitFor({state:'visible'});assert.match(await d.locator('#compare-content').innerText(),/Notas alteradas nas duas cópias/);await d.locator('#compare-close').click();assert(await d.locator('#merge-cloud').isHidden());assert.equal(payload.notes,'Notas B');
  // Reloading the cloud from the same writer must keep its durable draft.
  await b.locator('#notes').fill('Rascunho da própria aba');await b.locator('#account-details').evaluate(el=>el.open=true);await b.locator('#cloud-load').click();await b.waitForFunction(()=>document.getElementById('sync-state').textContent.includes('Conflito'));assert(await b.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':pending:')).some(key=>JSON.parse(localStorage.getItem(key)).payload.notes==='Rascunho da própria aba')),'manual cloud load must retain the current tab journal');
  assert.deepEqual(errors,[]);await c.close();console.log('PASS: independent cloud edits merge with revision guard, conflicting notes stay separate, clean tab refreshes on focus, same-tab recovery preserves journal.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
