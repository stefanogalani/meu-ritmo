'use strict';
(() => {
 const el=id=>document.getElementById(id), config=window.MEU_RITMO_CLOUD||{};
 let session=null, revision=0, busy=false, loaded=false, dirty=false, activeKey='meu-ritmo-v1', authMode='login', localMode=false;
 const status=(text,kind='info')=>{el('cloud-status').textContent=text;el('cloud-status').dataset.kind=kind;el('auth-status').textContent=text;el('auth-status').dataset.kind=kind;};
 const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)&&!!config.publicKey;
 const client=configured&&window.supabase?window.supabase.createClient(config.url,config.publicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
 function screen(){const app=!!session||localMode;el('app-screen').hidden=!app;el('auth-screen').hidden=app;el('open-login').hidden=!!session;}
 function mode(value){authMode=value;for(const id of ['login','signup'])el('auth-'+id).setAttribute('aria-pressed',String(value===id));el('auth-title').textContent=value==='signup'?'Comece seu novo ritmo.':'Bom ter você de volta.';el('auth-description').textContent=value==='signup'?'Crie sua conta para guardar tarefas e notas e acessar de outros dispositivos.':'Entre com seu e-mail para acessar suas tarefas e notas.';el('send-code').textContent=value==='signup'?'Criar conta por e-mail':'Entrar por e-mail';status('Enviaremos um link seguro para seu e-mail. Sem senha para lembrar.');}
 el('auth-login').onclick=()=>mode('login');el('auth-signup').onclick=()=>mode('signup');
 el('auth-form').onsubmit=e=>{e.preventDefault();el('send-code').click();};
 el('send-code').type='button';
 el('try-local').onclick=()=>{if(busy)return;localMode=true;screen();status('Modo local ativo. Entre para sincronizar.');};
 el('open-login').onclick=()=>{localMode=false;screen();mode('login');el('email').focus();};
 function controls(){
 screen();for(const id of ['auth-login','auth-signup','try-local'])el(id).disabled=busy;

 el('account-state').textContent=session?'● Conectado · '+session.user.email:'○ Modo local · Desconectado';
 el('account-state').dataset.connected=String(!!session);
 el('cloud-help').textContent=session?(loaded?'Alterações ficam locais até você clicar em Salvar na nuvem.':'Conectado, mas os dados ainda não carregaram. Tente Carregar nuvem.'):'Entre pelo link recebido no e-mail para habilitar os botões abaixo. Sua sessão será mantida neste navegador até você sair.';
 el('email').disabled=busy||!!session;
 for(const id of ['cloud-save','cloud-load','local-import'])el(id).disabled=busy||!session||!loaded;el('cloud-load').disabled=busy||!session;el('logout').disabled=busy||!session;el('verify').disabled=busy||!!session;el('send-code').disabled=busy||!!session;}
 function localWrite(){try{localStorage.setItem(activeKey,JSON.stringify(state));return true;}catch{status('Não foi possível guardar a cópia local. Exporte um backup.');return false;}}
 // O modo conectado usa um cache separado por usuário; o conteúdo local antigo é preservado.
 save=()=>{dirty=true;if(!busy){el('cloud-save').textContent='Salvar na nuvem';el('cloud-save').classList.remove('saved','failed');}const ok=localWrite();if(session)status('Alterações neste navegador. Clique em Salvar na nuvem para sincronizar.');return ok;};
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
 throw new Error((message||'O Supabase recusou a operação. Consulte Authentication → Logs no painel do projeto e informe o código abaixo.')+' (HTTP '+response.status+reference+')');
 }return data;}
 async function token(){if(!client||!session)throw Error('Entre na sua conta.');const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)throw Error('Sessão expirada. Entre novamente.');session=data.session;return session.access_token;}
 async function run(fn,id,working='Processando…'){
 if(busy)return;
 const button=id?el(id):null;
 if(id==='send-code'&&!el('email').reportValidity())return;
 busy=true;controls();
 if(button){button.textContent=working;button.classList.remove('saved','failed');button.classList.add('is-loading');button.setAttribute('aria-busy','true');}
 status(working,'loading');
 try{await fn();}catch(e){status(e.name==='TimeoutError'?'O serviço demorou para responder. O salvamento não foi confirmado; tente carregar a nuvem antes de reenviar.':e.message==='Failed to fetch'?'Sem conexão com o serviço. Nada foi confirmado na nuvem. Verifique sua internet e tente novamente.':e.message,'error');if(button){button.classList.add('failed');button.textContent=id==='cloud-save'?'Falha · Tentar salvar':id==='send-code'?'Tentar enviar novamente':'Tentar novamente';}}
 finally{busy=false;controls();if(button){button.classList.remove('is-loading');button.removeAttribute('aria-busy');if(!button.classList.contains('failed'))button.textContent=id==='cloud-save'?(dirty?'Salvar novas alterações':'✓ Salvo na nuvem'):id==='send-code'?'Reenviar link':id==='cloud-load'?'Carregar nuvem':'Sair';}}
 }
 function show(data){state={tasks:data.tasks.map(t=>({...t})),notes:data.notes};render();el('notes').value=state.notes;}
 async function load(){const t=await token();const rows=await request('/rest/v1/user_data?select=payload,revision&user_id=eq.'+encodeURIComponent(session.user.id),undefined,t);if(!Array.isArray(rows))throw Error('Resposta inesperada do banco.');let data={tasks:[],notes:''};if(rows.length){if(!valid(rows[0].payload))throw Error('Dados incompatíveis. A cópia local foi preservada.');data=rows[0].payload;revision=rows[0].revision;}else revision=0;show(data);loaded=true;dirty=false;localWrite();status('✓ Dados carregados da nuvem. '+session.user.email,'success');}
 el('send-code').onclick=()=>run(async()=>{if(!el('email').reportValidity())return;await request('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{email:el('email').value.trim(),create_user:authMode==='signup'});status('Link solicitado! Você ainda não está conectado. Abra o link recebido no e-mail para entrar. Confira também o spam.','success');},'send-code','Enviando link…');
 el('verify').onclick=()=>run(async()=>{const code=el('code').value.trim();if(!/^\d{6,10}$/.test(code))throw Error('Digite o código numérico recebido no e-mail.');const result=await request('/auth/v1/verify',{email:el('email').value.trim(),token:code,type:'email'});if(!result.access_token||!result.user)throw Error('Não foi possível entrar.');const {data:verified,error:verifyError}=await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});if(verifyError)throw verifyError;session=verified.session;activeKey='meu-ritmo-cloud-'+session.user.id;el('code').value='';show({tasks:[],notes:''});status('Conectado. Carregando dados…');try{await load();}catch(e){show({tasks:[],notes:''});throw e;}});
 el('cloud-save').onclick=()=>run(async()=>{const snapshot=JSON.parse(JSON.stringify(state));const t=await token();const next=await request('/rest/v1/rpc/save_my_data',{document:snapshot,expected_revision:revision},t);if(!Number.isInteger(next)||next<1)throw Error('O banco não confirmou o salvamento. Tente carregar a nuvem antes de salvar novamente.');revision=next;dirty=JSON.stringify(state)!==JSON.stringify(snapshot);el('cloud-save').classList.add('saved');status(dirty?'Cópia salva. Há novas alterações locais; salve novamente.':'✓ Dados salvos na nuvem às '+new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())+'.','success');},'cloud-save','Salvando na nuvem…');
 el('cloud-load').onclick=()=>run(async()=>{if(dirty&&!confirm('Carregar a nuvem substituirá as alterações locais. Exporte uma cópia antes, se precisar. Continuar?'))return;await load();},'cloud-load','Carregando nuvem…');
 el('local-import').onclick=()=>{try{const old=JSON.parse(localStorage.getItem('meu-ritmo-v1')||'null');if(!valid(old))throw Error();if(!confirm('Substituir a tela atual pelos seus dados do modo local? Depois clique em Salvar na nuvem.'))return;show(old);save();}catch{status('Não há dados locais válidos neste navegador. Você também pode importar um backup JSON.');}};
 function clearAccount(){session=null;localMode=false;loaded=false;dirty=false;revision=0;activeKey='meu-ritmo-v1';let old;try{old=JSON.parse(localStorage.getItem(activeKey));}catch{}show(valid(old)?old:{tasks:[],notes:''});controls();}
 el('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('Há alterações sem enviar à nuvem. Exporte uma cópia ou salve antes de sair. Sair mesmo assim?')){status('Saída cancelada. Suas alterações continuam neste navegador.');return;}const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;clearAccount();status('Você saiu com segurança deste navegador.');},'logout','Saindo…');
 if(client)client.auth.onAuthStateChange((event,next)=>{
  // Não faça chamadas assíncronas ao Auth dentro deste callback (lock do SDK).
  if(event==='SIGNED_OUT'&&session){clearAccount();status('Sessão encerrada. Entre novamente quando quiser.');}
  else if(next&&session&&next.user.id===session.user.id)session=next;
 });
 window.addEventListener('beforeunload',e=>{if(session&&dirty){e.preventDefault();e.returnValue='';}});
 mode('login');
 controls();
 if(!client){el('cloud-fields').hidden=true;el('send-code').disabled=true;status('Modo local ativo. A sincronização estará disponível após configurar o Supabase.');return;}
 const callback=new URLSearchParams(location.hash.slice(1));
 const access=callback.get('access_token'),refresh=callback.get('refresh_token'),callbackError=callback.has('error');
 if(access||callbackError)history.replaceState(null,'',location.pathname+location.search);
 run(async()=>{
  if(callbackError)throw Error('Link inválido ou expirado. Solicite um novo link de acesso.');
  let restored;
  if(access){
   if(!refresh)throw Error('Link de acesso inválido. Solicite outro.');
   const {data,error}=await client.auth.setSession({access_token:access,refresh_token:refresh});
   if(error)throw error;restored=data.session;
  }else{
   const {data,error}=await client.auth.getSession();if(error)throw error;restored=data.session;
  }
  if(!restored){status('Entre com seu e-mail. Você continuará conectado neste navegador até sair.');return;}
  // Valida a sessão no servidor antes de abrir a conta restaurada.
  const {data:checked,error}=await client.auth.getUser(restored.access_token);
  if(error)throw Error('Não foi possível validar sua sessão. Verifique a conexão ou solicite um novo link.');
  session={...restored,user:checked.user};activeKey='meu-ritmo-cloud-'+session.user.id;
  show({tasks:[],notes:''});await load();
 },undefined,'Recuperando sua sessão…');
})();
