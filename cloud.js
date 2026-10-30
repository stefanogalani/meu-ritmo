'use strict';
(() => {
 const el=id=>document.getElementById(id), config=window.MEU_RITMO_CLOUD||{};
 let session=null, revision=0, busy=false, loaded=false, dirty=false, activeKey='meu-ritmo-v1', authMode='login', localMode=false;
 let localSaved=true;
 const localStore=window.createLocalStore({key:'meu-ritmo-v1',canAdopt:()=>!el('edit-dialog').open,read:raw=>{try{const data=JSON.parse(raw);return valid(data)?normalize(data):null;}catch{return null;}},show:data=>{state=data;render();el('notes').value=state.notes;},notify:message=>{el('message').textContent=message;}});
 window.meuRitmoCanUpdate=()=>!busy&&(session?!dirty:localSaved&&localStore.canUpdate());
 let baseData=null;
 let syncTimer=null,retryTimer=null,conflict=false,editCount=0,draftKey=null,retryDelay=5000;
 const writer=crypto.randomUUID();
 function pending(){if(!session)return [];const prefix=activeKey+':pending:';const found=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(prefix)){const d=JSON.parse(localStorage.getItem(k));if(d&&valid(d.payload)&&Number.isInteger(d.revision))found.push({key:k,...d});}}}catch{}return found.sort((a,b)=>b.time-a.time);}
 function persistDraft(){if(!session)return localWrite();draftKey=draftKey||activeKey+':pending:'+writer;try{localStorage.setItem(draftKey,JSON.stringify({payload:state,base:baseData,revision,time:Date.now()}));localWrite();return true;}catch{status('Não foi possível guardar as alterações. Exporte um backup antes de fechar.','error');return false;}}
 function recovery(){el('merge-cloud').hidden=true;const drafts=pending();el('recovery').hidden=!drafts.length||(!conflict&&loaded&&drafts.length===1);const select=el('drafts');const selected=select.value;select.replaceChildren();for(const d of drafts){const option=document.createElement('option');option.value=d.key;option.textContent=new Date(d.time).toLocaleString('pt-BR')+' · '+d.payload.tasks.length+' tarefas';select.append(option);}if(drafts.some(d=>d.key===selected))select.value=selected;}
 function indicator(text,kind='info'){el('sync-state').textContent=text;el('sync-state').dataset.kind=kind;el('account-summary').textContent=text;if(kind==='error')el('account-details').open=true;}
 function schedule(delay=1000){clearTimeout(syncTimer);if(!session||!loaded||!dirty||conflict)return;indicator(navigator.onLine?'Alterações pendentes…':'Sem conexão · cópia guardada neste navegador');if(navigator.onLine)syncTimer=setTimeout(()=>{if(busy){schedule(500);return;}syncNow();},delay);}
 async function syncNow(){if(!session||!loaded||!dirty||busy||conflict||!window.meuRitmoDataFits(state))return;await run(async()=>{
  if(!navigator.onLine)throw Error('Sem conexão. Sua cópia local será enviada quando a conexão voltar.');
  const owner=session.user.id,snapshot=JSON.parse(JSON.stringify(state)),stamp=editCount,sentKey=draftKey;
  indicator('Sincronizando…','loading');const t=await token();const next=await request('/rest/v1/rpc/save_my_data',{document:snapshot,expected_revision:revision},t);
  if(!session||session.user.id!==owner)return;
  if(!Number.isInteger(next)||next<1)throw Error('O banco não confirmou o salvamento.');
  revision=next;baseData=snapshot;retryDelay=5000;dirty=stamp!==editCount;
  if(dirty)persistDraft();else{if(sentKey)localStorage.removeItem(sentKey);draftKey=null;localWrite();}
  recovery();indicator(dirty?'Há novas alterações pendentes':'✓ Sincronizado às '+new Date().toLocaleTimeString('pt-BR'),dirty?'info':'success');
  status(dirty?'Enviando as alterações mais recentes…':'✓ Dados salvos na nuvem.','success');
 },'cloud-save','Sincronizando…');if(dirty&&!conflict){clearTimeout(retryTimer);retryTimer=setTimeout(()=>schedule(),retryDelay);}}
 const status=(text,kind='info')=>{el('cloud-status').textContent=text;el('cloud-status').dataset.kind=kind;if(kind==='error')el('account-details').open=true;el('auth-status').textContent=text;el('auth-status').dataset.kind=kind;};
 const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)&&!!config.publicKey;
 const client=configured&&window.supabase?window.supabase.createClient(config.url,config.publicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
 function screen(){localStore.setActive(!session);const app=!!session||localMode;el('app-screen').hidden=!app;el('auth-screen').hidden=app;el('open-login').hidden=!!session;}
 function mode(value){authMode=value;for(const id of ['login','signup'])el('auth-'+id).setAttribute('aria-pressed',String(value===id));el('auth-title').textContent=value==='signup'?'Comece seu novo ritmo.':'Bom ter você de volta.';el('auth-description').textContent=value==='signup'?'Escolha Google ou e-mail para criar sua conta e levar seus dados com você.':'Escolha como entrar para acessar suas tarefas e notas.';el('send-code').textContent=value==='signup'?'Criar conta por e-mail':'Entrar por e-mail';status('Enviaremos um link seguro para seu e-mail. Sem senha para lembrar.');}
 el('auth-login').onclick=()=>mode('login');el('auth-signup').onclick=()=>mode('signup');
 el('auth-form').onsubmit=e=>{e.preventDefault();el('send-code').click();};
 el('send-code').type='button';
 el('try-local').onclick=()=>{if(busy)return;localMode=true;screen();status('Modo local ativo. Entre para sincronizar.');};
 el('open-login').onclick=()=>{localMode=false;screen();mode('login');el('email').focus();};
 function controls(){
 screen();for(const id of ['recover-draft','discard-draft'])el(id).disabled=busy;el('google-login').disabled=busy||!client||!!session;for(const id of ['auth-login','auth-signup','try-local'])el(id).disabled=busy;

 el('account-state').textContent=session?'● Conectado · '+session.user.email:'○ Modo local · Desconectado';
 el('account-state').dataset.connected=String(!!session);
 el('cloud-help').textContent=session?(loaded?'Salvamento automático ativo. Alterações pendentes são guardadas neste navegador.':'Conectado, mas os dados ainda não carregaram. Tente Carregar nuvem.'):'Entre pelo link recebido no e-mail para habilitar os botões abaixo. Sua sessão será mantida neste navegador até você sair.';
 el('email').disabled=busy||!!session;
 for(const id of ['cloud-save','cloud-load','local-import'])el(id).disabled=busy||!session||!loaded;el('cloud-load').disabled=busy||!session;el('logout').disabled=busy||!session;el('verify').disabled=busy||!!session;el('send-code').disabled=busy||!!session;}
 function localWrite(){if(!session)return localStore.write(state);try{localStorage.setItem(activeKey,JSON.stringify(state));return true;}catch{status('Não foi possível guardar a cópia local. Exporte um backup.');return false;}}
 // O modo conectado usa um cache separado por usuário; o conteúdo local antigo é preservado.
 save=()=>{dirty=true;editCount++;const ok=session?persistDraft():localWrite();localSaved=ok;if(!window.meuRitmoDataFits(state)){clearTimeout(syncTimer);clearTimeout(retryTimer);status(window.meuRitmoSizeMessage,'error');el('message').textContent=window.meuRitmoSizeMessage;indicator('Cópia local · limite de sincronização excedido','error');el('account-details').open=true;return false;}if(session){el('cloud-save').textContent='Sincronizar agora';el('cloud-save').classList.remove('saved','failed');recovery();schedule();}return ok;};
 async function request(path,body,token){const response=await fetch(config.url+path,{signal:AbortSignal.timeout(20000),method:body===undefined?'GET':'POST',headers:{apikey:config.publicKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json().catch(()=>null);if(!response.ok){
 const code=typeof data?.code==='string'?data.code:typeof data?.error_code==='string'?data.error_code:'';
 const messages={
 over_email_send_rate_limit:'O Supabase atingiu o limite de envio de e-mails. Aguarde antes de solicitar outro link. Se continuar, confira os limites de e-mail no painel do projeto.',
 over_request_rate_limit:'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
 email_address_not_authorized:'O serviço de e-mail do Supabase não autorizou esse destinatário. Use o e-mail de um membro da organização ou configure SMTP próprio no projeto.',
 email_not_confirmed:'Seu e-mail ainda não foi confirmado. Use Criar conta para solicitar um novo link e conclua o acesso pelo e-mail.',
 user_not_found:'Não foi possível entrar nessa conta. Se for seu primeiro acesso, escolha Criar conta.',
 signups_not_allowed:'O Supabase não permitiu criar ou localizar a conta para este acesso. Confira o endereço de e-mail; no primeiro acesso, escolha Criar conta. Se persistir, confira se novos cadastros estão habilitados no projeto.',
 signup_disabled:'Novos cadastros estão desabilitados no Supabase. Habilite-os em Authentication → Sign In / Providers para criar sua conta.',
 email_provider_disabled:'O login por e-mail está desabilitado. Ative Email em Authentication → Sign In / Providers.',
 otp_disabled:'O acesso por link de e-mail está desabilitado no projeto Supabase.',
 otp_expired:'O link expirou ou já foi utilizado. Solicite outro e abra o e-mail mais recente.',
 email_address_invalid:'Confira o endereço de e-mail informado.',
 unexpected_failure:'O Supabase não conseguiu concluir a operação. Confira Authentication → Logs no painel do projeto.'
 };
 let message=messages[code];
 if(!message&&response.status===429)message='Limite de tentativas ou de envio de e-mails atingido. Aguarde antes de tentar novamente.';
 if(!message&&response.status===401)message=path.startsWith('/auth/v1/otp')?'O Supabase recusou a configuração de acesso. Confira a URL do projeto e a chave pública.':'Sessão expirada. Saia e entre novamente.';
 if(!message&&response.status===409)message='Conflito: outra sessão salvou primeiro. Exporte sua cópia antes de carregar a nuvem.';
 // O provedor antigo pode enviar somente msg, sem um código de erro.
 const providerMessage=typeof data?.msg==='string'?data.msg:typeof data?.message==='string'?data.message:'';
 if(!message&&/email address not authorized|only send.*(?:team|organization)|unauthorized.*email/i.test(providerMessage))message=messages.email_address_not_authorized;
 if(!message&&/signups not allowed|user not found/i.test(providerMessage))message=messages.signups_not_allowed;
 const reference=/^[a-z0-9_]{1,80}$/i.test(code)?'; '+code:'';
 const failure=new Error((message||'O Supabase recusou a operação. Consulte Authentication → Logs no painel do projeto e informe o código abaixo.')+' (HTTP '+response.status+reference+')');failure.httpStatus=response.status;throw failure;
 }return data;}
 async function token(){if(!client||!session)throw Error('Entre na sua conta.');const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)throw Error('Sessão expirada. Entre novamente.');if(!session||data.session.user.id!==session.user.id){clearAccount();throw Error('A conta mudou em outra aba. Recarregue para continuar.');}session=data.session;return session.access_token;}
 async function run(fn,id,working='Processando…'){
 if(busy)return;
 const button=id?el(id):null;
 if(id==='send-code'&&!el('email').reportValidity())return;
 busy=true;controls();
 if(button){button.textContent=working;button.classList.remove('saved','failed');button.classList.add('is-loading');button.setAttribute('aria-busy','true');}
 status(working,'loading');
 try{await fn();}catch(e){if(session&&dirty){retryDelay=Math.min(60000,retryDelay*2);if(e.httpStatus===409){conflict=true;indicator('Conflito · cópia local preservada','error');recovery();}else indicator('Não sincronizado · cópia local pendente','error');}status(e.name==='TimeoutError'?'O serviço demorou para responder. O salvamento não foi confirmado; tente carregar a nuvem antes de reenviar.':e.message==='Failed to fetch'?'Sem conexão com o serviço. Nada foi confirmado na nuvem. Verifique sua internet e tente novamente.':e.message,'error');if(button){button.classList.add('failed');button.textContent=id==='cloud-save'?'Falha · Tentar salvar':id==='send-code'?'Tentar enviar novamente':'Tentar novamente';}}
 finally{busy=false;controls();if(button){button.classList.remove('is-loading');button.removeAttribute('aria-busy');if(!button.classList.contains('failed'))button.textContent=id==='google-login'?'Continuar com Google':id==='cloud-save'?(dirty?'Sincronizar agora':'✓ Sincronizado'):id==='send-code'?'Reenviar link':id==='cloud-load'?'Carregar nuvem':'Sair';}}
 }
 function show(data){state=normalize(data);render();el('notes').value=state.notes;window.setTimerScope(activeKey,loaded);}
 async function load(){
 const owner=session.user.id,stamp=editCount;const t=await token();const rows=await request('/rest/v1/user_data?select=payload,revision&user_id=eq.'+encodeURIComponent(owner),undefined,t);
 if(!session||session.user.id!==owner)return;if(!Array.isArray(rows))throw Error('Resposta inesperada do banco.');
 const data=rows.length?rows[0].payload:{tasks:[],notes:''},remoteRevision=rows.length?rows[0].revision:0;if(!valid(data))throw Error('Dados incompatíveis. Cópias locais preservadas.');
 if(stamp!==editCount){conflict=true;loaded=true;recovery();indicator('Edição durante carregamento · cópia preservada','error');return;}
 // Uma resposta perdida após gravar pode deixar um rascunho idêntico ao servidor.
 for(const d of pending())if(JSON.stringify(d.payload)===JSON.stringify(data))localStorage.removeItem(d.key);
 const drafts=pending();revision=remoteRevision;loaded=true;dirty=false;conflict=false;draftKey=null;
 if(drafts.length){const d=drafts[0];baseData=d.base||null;show(d.payload);revision=d.revision;dirty=true;draftKey=activeKey+':pending:'+writer;localStorage.setItem(draftKey,JSON.stringify({payload:d.payload,base:baseData,revision:d.revision,time:d.time}));localStorage.removeItem(d.key);conflict=d.revision!==remoteRevision||drafts.length>1;indicator(conflict?'Conflito · escolha qual cópia manter':'Cópia pendente recuperada');status(conflict?'Há alterações locais e uma versão diferente na nuvem. Exporte um backup e use o painel de recuperação.':'Alterações pendentes recuperadas. A sincronização será retomada.');recovery();schedule();}
 else{baseData=normalize(data);show(data);localWrite();recovery();indicator('✓ Sincronizado','success');status('✓ Dados carregados da nuvem. '+session.user.email,'success');}
 }
 el('recover-draft').onclick=()=>{const d=pending().find(d=>d.key===el('drafts').value);if(!d)return;if(dirty&&draftKey!==d.key&&!confirm('Trocar a cópia em edição? As cópias pendentes serão preservadas.'))return;clearTimeout(syncTimer);baseData=d.base||null;show(d.payload);revision=d.revision;dirty=true;draftKey=d.key;conflict=true;recovery();indicator('Cópia recuperada · exporte antes de resolver o conflito','error');status('Cópia local recuperada. Para manter a versão remota, use Descartar esta cópia. Para mesclar, exporte esta cópia, descarte-a, carregue a nuvem e refaça as alterações desejadas.');};
 el('discard-draft').onclick=()=>run(async()=>{const k=el('drafts').value;if(!k||!confirm('Descartar esta cópia pendente e carregar a nuvem? Exporte um backup antes, se precisar.'))return;localStorage.removeItem(k);if(draftKey===k)draftKey=null;dirty=false;conflict=false;await load();},'cloud-load','Carregando nuvem…');
 async function comparison(apply=false){
 if(!session||!loaded)return;
 await run(async()=>{
  const owner=session.user.id,stamp=editCount,t=await token();
  const rows=await request('/rest/v1/user_data?select=payload,revision&user_id=eq.'+encodeURIComponent(owner),undefined,t);
  if(session?.user.id!==owner||stamp!==editCount)throw Error('A cópia mudou durante a comparação. Tente novamente.');
  if(!Array.isArray(rows)||!rows.length||!valid(rows[0].payload))throw Error('Não foi possível comparar com a nuvem.');
  const remote=normalize(rows[0].payload),result=window.meuRitmoMerge(baseData,state,remote);
  if(result.merged&&(!valid(result.merged)||!window.meuRitmoDataFits(result.merged))){result.merged=null;result.conflicts.push('A combinação excede os limites de dados.');}
  const details=[];
  for(const field of ['tasks','trash','sessions'])details.push(field+': nesta cópia '+(state[field]||[]).length+' · na nuvem '+(remote[field]||[]).length);
  const localTasks=new Map(state.tasks.map(task=>[task.id,task])),remoteTasks=new Map(remote.tasks.map(task=>[task.id,task]));
  for(const id of new Set([...localTasks.keys(),...remoteTasks.keys()]))if(JSON.stringify(localTasks.get(id))!==JSON.stringify(remoteTasks.get(id)))details.push('Tarefa diferente: '+(localTasks.get(id)?.text||remoteTasks.get(id)?.text));
  if(state.notes!==remote.notes)details.push('Notas desta cópia:\n'+state.notes+'\n\nNotas da nuvem:\n'+remote.notes);
  if(result.conflicts.length)details.push('Precisam de resolução manual:\n'+result.conflicts.join('\n'));
  el('compare-summary').textContent=result.merged?'As alterações independentes podem ser combinadas. Edições diferentes da mesma tarefa ou das notas exigem resolução manual.':'Há alterações que precisam de resolução manual. Exporte sua cópia antes de descartar.';
  el('compare-content').textContent=details.join('\n\n');el('merge-cloud').hidden=!result.merged;
  if(!apply){el('compare-dialog').showModal();return;}
  if(!result.merged)throw Error('As cópias mudaram ou ainda têm conflitos. Compare novamente.');
  if(!confirm('Combinar as alterações independentes com a versão da nuvem?'))return;
  baseData=remote;revision=rows[0].revision;show(result.merged);conflict=false;save();recovery();status('Cópias combinadas. Enviando para a nuvem…');
 },undefined,'Comparando cópias…');
}
el('compare-cloud').onclick=()=>comparison();el('merge-cloud').onclick=()=>comparison(true);el('compare-close').onclick=()=>el('compare-dialog').close();
el('google-login').onclick=()=>run(async()=>{
  if(!client)throw Error('A conexão com o Supabase ainda não está configurada.');
  const settings=await request('/auth/v1/settings');
  if(!settings?.external?.google)throw Error('O login Google ainda precisa ser ativado em Supabase → Authentication → Sign In / Providers → Google. Configure o Client ID e o Client Secret do Google Cloud.');
  const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
  if(error)throw error;
  if(!data.url)throw Error('Não foi possível abrir o login Google. Tente novamente.');
  status('Abrindo o Google. Escolha sua conta para continuar.','loading');
  location.assign(data.url);
 },'google-login','Abrindo Google…');
 el('send-code').onclick=()=>run(async()=>{if(!el('email').reportValidity())return;await request('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{email:el('email').value.trim(),create_user:authMode==='signup'});status('Link solicitado! Você ainda não está conectado. Abra o link recebido no e-mail para entrar. Confira também o spam.','success');},'send-code','Enviando link…');
 el('verify').onclick=()=>run(async()=>{const code=el('code').value.trim();if(!/^\d{6,10}$/.test(code))throw Error('Digite o código numérico recebido no e-mail.');const result=await request('/auth/v1/verify',{email:el('email').value.trim(),token:code,type:'email'});if(!result.access_token||!result.user)throw Error('Não foi possível entrar.');const {data:verified,error:verifyError}=await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});if(verifyError)throw verifyError;session=verified.session;activeKey='meu-ritmo-cloud-'+session.user.id;el('code').value='';show({tasks:[],notes:''});status('Conectado. Carregando dados…');try{await load();}catch(e){show({tasks:[],notes:''});throw e;}});
 el('cloud-save').onclick=()=>{if(conflict){status('Resolva o conflito no painel de recuperação antes de sincronizar.','error');return;}syncNow();};
 el('cloud-load').onclick=()=>run(async()=>{if(dirty){status('Sua cópia pendente será preservada durante a verificação da nuvem.');}clearTimeout(syncTimer);await load();},'cloud-load','Carregando nuvem…');
 el('local-import').onclick=()=>{try{const old=JSON.parse(localStorage.getItem('meu-ritmo-v1')||'null');if(!valid(old))throw Error();if(!confirm('Substituir a tela atual pelos seus dados do modo local? Depois clique em Salvar na nuvem.'))return;show(old);save();}catch{status('Não há dados locais válidos neste navegador. Você também pode importar um backup JSON.');}};
 function clearAccount(){clearTimeout(syncTimer);clearTimeout(retryTimer);conflict=false;draftKey=null;session=null;baseData=null;localMode=false;loaded=false;dirty=false;revision=0;activeKey='meu-ritmo-v1';let old;try{old=JSON.parse(localStorage.getItem(activeKey));}catch{}show(valid(old)?old:{tasks:[],notes:''});window.setTimerScope(activeKey,true);el('recovery').hidden=true;indicator('Modo local');controls();}
 el('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('Há alterações sem enviar à nuvem. Exporte uma cópia ou salve antes de sair. Sair mesmo assim?')){status('Saída cancelada. Suas alterações continuam neste navegador.');return;}const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;clearAccount();status('Você saiu com segurança deste navegador.');},'logout','Saindo…');
 if(client)client.auth.onAuthStateChange((event,next)=>{
  // Não faça chamadas assíncronas ao Auth dentro deste callback (lock do SDK).
  if(event==='SIGNED_OUT'&&session){clearAccount();status('Sessão encerrada. Entre novamente quando quiser.');}
  else if(next&&session){if(next.user.id===session.user.id)session=next;else{clearAccount();status('A conta mudou em outra aba. Recarregue para continuar.','error');}}
 });
 window.addEventListener('online',()=>{if(!session)return;if(!loaded){run(()=>load(),undefined,'Reconectando…');}else schedule(0);});
 let lastRemoteCheck=0;
 async function checkRemote(){
  if(document.visibilityState==='hidden'||el('edit-dialog').open||!session||!loaded||busy||dirty||conflict||!navigator.onLine||Date.now()-lastRemoteCheck<5000)return;
  lastRemoteCheck=Date.now();const owner=session.user.id,stamp=editCount;
  await run(async()=>{const t=await token();const rows=await request('/rest/v1/user_data?select=revision&user_id=eq.'+encodeURIComponent(owner),undefined,t);if(session?.user.id!==owner||stamp!==editCount||dirty)return;if(Array.isArray(rows)&&rows.length&&rows[0].revision!==revision)await load();else status('✓ Dados conferidos com a nuvem.','success');},undefined,'Verificando alterações…');
 }
 window.addEventListener('focus',checkRemote);document.addEventListener('visibilitychange',checkRemote);
 window.addEventListener('offline',()=>{if(session&&dirty)indicator('Sem conexão · cópia guardada neste navegador');});
 window.addEventListener('beforeunload',e=>{if(session&&dirty){persistDraft();e.preventDefault();e.returnValue='';}});
 mode('login');
 controls();
 if(!client){el('cloud-fields').hidden=true;el('send-code').disabled=true;status('Modo local ativo. A sincronização estará disponível após configurar o Supabase.');return;}
 const callback=new URLSearchParams(location.hash.slice(1));
 const access=callback.get('access_token'),refresh=callback.get('refresh_token'),callbackError=callback.has('error');
 if(access||callbackError)history.replaceState(null,'',location.pathname+location.search);
 run(async()=>{
  if(callbackError)throw Error('O acesso não foi concluído ou expirou. Tente novamente com Google ou solicite outro link de e-mail.');
  let restored;
  if(access){
   if(!refresh)throw Error('Link de acesso inválido. Solicite outro.');
   const {data,error}=await client.auth.setSession({access_token:access,refresh_token:refresh});
   if(error)throw error;restored=data.session;
  }else{
   const {data,error}=await client.auth.getSession();if(error)throw error;restored=data.session;
  }
  if(!restored){status('Entre com seu e-mail. Você continuará conectado neste navegador até sair.');return;}
  session=restored;activeKey='meu-ritmo-cloud-'+session.user.id;
  show({tasks:[],notes:''});
  try{await load();}catch(error){const drafts=pending();let cached;try{cached=JSON.parse(localStorage.getItem(activeKey));}catch{}if(drafts.length){const d=drafts[0];baseData=d.base||null;show(d.payload);revision=d.revision;draftKey=d.key;dirty=true;}else if(valid(cached))show(cached);window.setTimerScope(activeKey,true);recovery();indicator('Offline ou falha de conexão · cópia local disponível','error');throw error;}

 },undefined,'Recuperando sua sessão…');
})();
