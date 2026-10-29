'use strict';
(() => {
 const el=id=>document.getElementById(id), config=window.MEU_RITMO_CLOUD||{};
 let session=null, revision=0, busy=false, loaded=false, dirty=false, activeKey='meu-ritmo-v1';
 const status=text=>{el('cloud-status').textContent=text;};
 const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)&&!!config.publicKey;
 function controls(){for(const id of ['cloud-save','cloud-load','local-import'])el(id).disabled=busy||!session||!loaded;el('cloud-load').disabled=busy||!session;el('logout').disabled=busy||!session;el('verify').disabled=busy||!!session;el('send-code').disabled=busy||!!session;}
 function localWrite(){try{localStorage.setItem(activeKey,JSON.stringify(state));return true;}catch{status('Não foi possível guardar a cópia local. Exporte um backup.');return false;}}
 // O modo conectado usa um cache separado por usuário; o conteúdo local antigo é preservado.
 save=()=>{dirty=true;const ok=localWrite();if(session)status('Alterações neste navegador. Clique em Salvar na nuvem para sincronizar.');return ok;};
 async function request(path,body,token){const response=await fetch(config.url+path,{method:body===undefined?'GET':'POST',headers:{apikey:config.publicKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(response.status===401?'Sessão expirada. Saia e entre novamente.':response.status===409?'Conflito: outra sessão salvou primeiro. Exporte sua cópia antes de carregar a nuvem.':'Operação recusada. Confira o código, a conexão e a configuração do Supabase.');return data;}
 async function token(){if(!session)throw Error('Entre na sua conta.');if(Date.now()/1000>=session.expires_at-60){const fresh=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});session={...fresh,expires_at:Date.now()/1000+fresh.expires_in};}return session.access_token;}
 async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){status(e.message);}finally{busy=false;controls();}}
 function show(data){state={tasks:data.tasks.map(t=>({...t})),notes:data.notes};render();el('notes').value=state.notes;}
 async function load(){const t=await token();const rows=await request('/rest/v1/user_data?select=payload,revision&user_id=eq.'+encodeURIComponent(session.user.id),undefined,t);if(!Array.isArray(rows))throw Error('Resposta inesperada do banco.');let data={tasks:[],notes:''};if(rows.length){if(!valid(rows[0].payload))throw Error('Dados incompatíveis. A cópia local foi preservada.');data=rows[0].payload;revision=rows[0].revision;}else revision=0;show(data);loaded=true;dirty=false;localWrite();status('Dados carregados da nuvem. '+session.user.email);}
 el('send-code').onclick=()=>run(async()=>{if(!el('email').reportValidity())return;await request('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{email:el('email').value.trim(),create_user:true});status('Solicitação enviada. Abra o link recebido no e-mail para entrar. Confira também o spam.');});
 el('verify').onclick=()=>run(async()=>{const code=el('code').value.trim();if(!/^\d{6,10}$/.test(code))throw Error('Digite o código numérico recebido no e-mail.');const result=await request('/auth/v1/verify',{email:el('email').value.trim(),token:code,type:'email'});if(!result.access_token||!result.user)throw Error('Não foi possível entrar.');session={...result,expires_at:Date.now()/1000+result.expires_in};activeKey='meu-ritmo-cloud-'+session.user.id;el('code').value='';show({tasks:[],notes:''});status('Conectado. Carregando dados…');try{await load();}catch(e){show({tasks:[],notes:''});throw e;}});
 el('cloud-save').onclick=()=>run(async()=>{const snapshot=JSON.parse(JSON.stringify(state));const t=await token();const next=await request('/rest/v1/rpc/save_my_data',{document:snapshot,expected_revision:revision},t);revision=next;dirty=JSON.stringify(state)!==JSON.stringify(snapshot);status(dirty?'Cópia salva. Há novas alterações locais; salve novamente.':'Dados salvos na nuvem.');});
 el('cloud-load').onclick=()=>run(async()=>{if(dirty&&!confirm('Carregar a nuvem substituirá as alterações locais. Exporte uma cópia antes, se precisar. Continuar?'))return;await load();});
 el('local-import').onclick=()=>{try{const old=JSON.parse(localStorage.getItem('meu-ritmo-v1')||'null');if(!valid(old))throw Error();if(!confirm('Substituir a tela atual pelos seus dados do modo local? Depois clique em Salvar na nuvem.'))return;show(old);save();}catch{status('Não há dados locais válidos neste navegador. Você também pode importar um backup JSON.');}};
 el('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('Há alterações sem enviar à nuvem. Exporte uma cópia ou salve antes de sair. Sair mesmo assim?'))return;try{await request('/auth/v1/logout',{},await token());}finally{session=null;loaded=false;dirty=false;revision=0;activeKey='meu-ritmo-v1';let old;try{old=JSON.parse(localStorage.getItem(activeKey));}catch{}show(valid(old)?old:{tasks:[],notes:''});status('Você saiu. Modo local ativo.');}});
 window.addEventListener('beforeunload',e=>{if(session&&dirty){e.preventDefault();e.returnValue='';}});
 if(!configured){el('cloud-fields').hidden=true;status('Modo local ativo. A sincronização estará disponível após configurar o Supabase.');}else{status('Entre por e-mail para sincronizar. Sua sessão termina ao recarregar esta página.');controls();}
 // O link padrão do Supabase retorna tokens no fragmento, que não é enviado ao servidor.
 const callback=new URLSearchParams(location.hash.slice(1));
 if(callback.has('access_token')||callback.has('error')){
  history.replaceState(null,'',location.pathname+location.search);
  if(callback.has('error'))status('Link inválido ou expirado. Solicite um novo link de acesso.');
  else if(configured)run(async()=>{
   const access=callback.get('access_token'),refresh=callback.get('refresh_token');
   const user=await request('/auth/v1/user',undefined,access);
   if(!user?.id||!refresh)throw Error('Link de acesso inválido. Solicite outro.');
   session={access_token:access,refresh_token:refresh,user,expires_at:Date.now()/1000+(Number(callback.get('expires_in'))||3600)};
   activeKey='meu-ritmo-cloud-'+user.id;
   show({tasks:[],notes:''});
   await load();
  });
 }
})();
