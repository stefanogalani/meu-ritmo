const {chromium}=require('playwright');
const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({downloadsPath:require('path').resolve(__dirname,'../test-results/downloads'),...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.clock.install({time:new Date('2026-10-29T12:00:00Z')});await page.clock.pauseAt(new Date(Date.parse('2026-10-29T12:00:00Z')+1000));
  await page.goto('http://127.0.0.1:8765/');await page.locator('#try-local').click();await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
  for(const [title,due] of [['Escrever proposta','2026-10-29'],['Enviar recibos','2026-10-28'],['Estudar inglês',''],['Ler livro','']]){
   await page.locator('#task-input').fill(title);if(due)await page.locator('#task-due').fill(due);await page.locator('#task-input').press('Enter');
  }
  assert.match(await page.locator('#day-today').innerText(),/Escrever proposta/);assert.match(await page.locator('#day-overdue').innerText(),/Enviar recibos/);
  for(const name of ['Escrever proposta','Enviar recibos','Estudar inglês'])await page.getByRole('button',{name:'Priorizar hoje '+name,exact:true}).click();
  assert.equal(await page.locator('#day-priorities>li').count(),3);
  await page.getByRole('button',{name:'Priorizar hoje Ler livro',exact:true}).click();assert.match(await page.locator('#message').innerText(),/três prioridades/);assert.equal(await page.locator('#day-priorities>li').count(),3);
  await page.getByRole('checkbox',{name:'Concluir prioridade Estudar inglês',exact:true}).check();assert.match(await page.locator('#day-summary').innerText(),/1\/3/);
  await page.locator('#day-show-overdue').click();assert.equal(await page.locator('#tasks>li').count(),1);assert.match(await page.locator('#tasks').innerText(),/Enviar recibos/);
  await page.locator('#day-priorities').getByRole('button',{name:'Focar em Escrever proposta',exact:true}).click();assert.equal(await page.locator('#toggle').innerText(),'Pausar');assert(await page.locator('#focus-task').isDisabled());await page.locator('#toggle').click();assert.notEqual(await page.locator('#toggle').innerText(),'Pausar');await page.locator('#day-priorities').getByRole('button',{name:'Focar em Escrever proposta',exact:true}).click();assert.equal(await page.locator('#toggle').innerText(),'Pausar');
  await page.clock.fastForward(60000);await page.reload();await page.locator('#try-local').click();await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));assert.equal(await page.locator('#clock').innerText(),'24:00');assert.match(await page.locator('#focus-task-help').innerText(),/Escrever proposta/);
  await page.clock.fastForward(24*60*1000+250);assert.equal(await page.locator('#focus-today').innerText(),'25');assert.match(await page.locator('#focus-history').innerText(),/Escrever proposta/);assert.match(await page.locator('#focus-by-task').innerText(),/Escrever proposta/);
  assert.equal(await page.evaluate(()=>state.sessions[0].taskId),await page.evaluate(()=>state.tasks.find(t=>t.text==='Escrever proposta').id));
  const record=await page.evaluate(()=>state.sessions[0]);assert.equal(record.taskText,'Escrever proposta');
  await page.getByRole('button',{name:'Excluir Escrever proposta',exact:true}).click();assert.match(await page.locator('#focus-history').innerText(),/Escrever proposta/);assert.match(await page.locator('#focus-by-task').innerText(),/Escrever proposta/);
  await page.locator('#reset').click();await page.locator('#focus-task').selectOption('');await page.locator('#toggle').click();await page.clock.fastForward(25*60*1000+250);assert.match(await page.locator('#focus-by-task').innerText(),/Foco livre/);
  await page.clock.setFixedTime(new Date('2026-10-30T12:00:00Z'));await page.clock.fastForward(30000);assert.equal(await page.locator('#day-priorities>li').count(),0);assert.match(await page.locator('#day-overdue').innerText(),/Enviar recibos/);
  await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:require('path').join(require('os').tmpdir(),'ritmo-myday.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: agenda diária, três prioridades, limite, conclusão, filtros, foco ligado a tarefa, reload, histórico após exclusão, foco livre, virada do dia e layout móvel.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
