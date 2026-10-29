const {chromium}=require('playwright');
const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:8765/');await page.locator('#try-local').click();
  await page.locator('#task-input').fill('Planejar viagem');await page.locator('#task-category').fill('  Pessoal  ');
  await page.locator('.new-subtasks summary').click();await page.locator('#task-subtasks').fill('Comprar passagem\nReservar hotel');
  await page.locator('#task-input').press('Enter');
  assert.equal(await page.locator('#tasks>li').count(),1);assert.equal(await page.locator('.subtask-row').count(),2);
  assert.match(await page.locator('.pill.category').innerText(),/Pessoal/);
  await page.locator('.subtask-row').first().locator('input').check();assert.match(await page.locator('.subtask-count').innerText(),/1 de 2/);
  assert(!(await page.locator('#tasks>li>input').isChecked()));
  await page.locator('.subtask-row').last().locator('input').check();assert(await page.locator('#tasks>li>input').isChecked());
  await page.locator('.subtask-row').first().locator('input').uncheck();assert(!(await page.locator('#tasks>li>input').isChecked()));
  await page.getByRole('button',{name:'Editar Planejar viagem',exact:true}).click();
  await page.locator('#edit-subtasks').fill('Reservar hotel\nComprar passagem\nFazer a mala');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  assert(await page.locator('.subtask-row').first().locator('input').isChecked());assert.equal(await page.locator('.subtask-row').count(),3);
  await page.locator('#search').fill('mala');assert.equal(await page.locator('#tasks>li').count(),1);
  await page.locator('#search').fill('');
  await page.locator('#task-input').fill('Entregar relatório');await page.locator('#task-category').fill('Trabalho');await page.locator('#task-input').press('Enter');
  await page.locator('#filter-category').selectOption('category:pessoal');assert.equal(await page.locator('#tasks>li').count(),1);
  await page.locator('#filter-priority').selectOption('high');assert.equal(await page.locator('#tasks>li').count(),0);
  await page.locator('#filter-priority').selectOption('all');await page.locator('#filter-category').selectOption('none');assert.equal(await page.locator('#tasks>li').count(),0);
  await page.locator('#filter-category').selectOption('all');await page.locator('#search').fill('trabalho');assert.match(await page.locator('#tasks').innerText(),/relatório/);
  await page.locator('#search').fill('');await page.getByRole('button',{name:'Editar Planejar viagem',exact:true}).click();
  await page.locator('#edit-subtasks').fill(Array.from({length:31},(_,i)=>'Passo '+i).join('\n'));await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  assert.match(await page.locator('#edit-error').innerText(),/30/);await page.locator('#edit-cancel').click();
  await page.reload();await page.locator('#try-local').click();
  assert.equal(await page.locator('.subtask-row').count(),3);assert(await page.locator('.subtask-row').first().locator('input').isChecked());
  await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/meu-ritmo-organization.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: categorias, busca por categoria/subtarefa, filtros combinados, conclusão por passos, edição preservando progresso, limites, reload e layout móvel.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
