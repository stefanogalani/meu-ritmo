'use strict';
(() => {
 let installPrompt=null,registration=null,applying=false,controllerChanged=false,checkRunning=false;
 let controller=navigator.serviceWorker?.controller;
 const button=document.getElementById('install-app'),help=document.getElementById('install-dialog');
 const notice=document.getElementById('update-notice'),text=document.getElementById('update-text'),apply=document.getElementById('apply-update'),check=document.getElementById('check-update');
 function announce(message,ready=false){notice.hidden=false;text.textContent=message;apply.hidden=!ready;}
 function reloadCurrentApp(){const url=new URL(location.href);url.searchParams.delete('atualizar');if(url.href!==location.href)location.replace(url.href);else location.reload();}
 function ready(){announce(controllerChanged?'A nova versão já está preparada. Atualize esta página para usá-la.':'Uma nova versão do Meu Ritmo está pronta.',true);}
 function bounded(promise,milliseconds=12000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('A verificação demorou mais que o esperado. Confira a conexão e tente novamente.')),milliseconds);})]).finally(()=>clearTimeout(timer));}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;button.hidden=false;});
 button.onclick=async()=>{if(!installPrompt)return;button.disabled=true;try{await installPrompt.prompt();const result=await installPrompt.userChoice;if(result.outcome==='accepted')button.hidden=true;installPrompt=null;}catch{help.showModal();}finally{button.disabled=false;}};
 window.addEventListener('appinstalled',()=>{button.hidden=true;installPrompt=null;});
 document.getElementById('install-help').onclick=()=>help.showModal();
 document.getElementById('install-close').onclick=()=>help.close();
 const supported='serviceWorker' in navigator&&window.isSecureContext&&/^https?:$/.test(location.protocol);
 function observe(result){registration=result;if(registration.waiting)ready();const watch=worker=>{if(!worker)return;const changed=()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)ready();if(worker.state==='redundant')announce('Não foi possível preparar a atualização. Confira a conexão e tente novamente.');};worker.addEventListener('statechange',changed);changed();};watch(result.installing);result.addEventListener('updatefound',()=>watch(result.installing));return result;}
 const registrationPromise=supported?navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(observe).catch(()=>null):Promise.resolve(null);
 check.onclick=async()=>{
  if(checkRunning)return;
  checkRunning=true;check.disabled=true;check.textContent='Verificando…';check.classList.add('is-loading');check.setAttribute('aria-busy','true');announce('Verificando se existe uma nova versão…');
  try{
   if(!supported)throw Error('Este navegador não oferece atualização offline. Reabra o site com internet para carregar a versão atual.');
   const result=registration||await bounded(registrationPromise);if(!result)throw Error('Não foi possível preparar as atualizações. Confira a conexão e tente recarregar a página.');
   if(result.waiting||controllerChanged){ready();return;}
   if(!navigator.onLine)throw Error('Você está sem conexão. Conecte-se à internet para procurar atualizações.');
   await bounded(result.update());
   if(result.waiting||controllerChanged)ready();else if(result.installing)announce('Nova versão encontrada. Preparando os arquivos…');else announce('Você já está usando a versão mais recente disponível.');
  }catch(error){announce(error.message||'Não foi possível verificar a atualização. Tente novamente.');}
  finally{checkRunning=false;check.disabled=false;check.textContent='Verificar atualização';check.classList.remove('is-loading');check.removeAttribute('aria-busy');}
 };
 apply.onclick=()=>{
  if(!registration?.waiting&&!controllerChanged){announce('Não há uma atualização pronta. Clique em Verificar atualização.');return;}
  if(!window.meuRitmoCanUpdate?.()){announce('Há uma operação ou alterações pendentes. Aguarde a sincronização antes de atualizar. Suas cópias locais serão preservadas.',true);return;}
  if(controllerChanged){reloadCurrentApp();return;}
  applying=true;apply.disabled=true;announce('Atualizando o Meu Ritmo…');registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  setTimeout(()=>{if(!applying)return;applying=false;apply.disabled=false;announce('A atualização ainda não terminou. Tente novamente ou feche e reabra o app após sincronizar.',!!registration.waiting||controllerChanged);},15000);
 };
 if(supported){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{const next=navigator.serviceWorker.controller;if(controller&&next!==controller){controllerChanged=true;if(applying){reloadCurrentApp();return;}ready();}controller=next;});
  registrationPromise.then(result=>{if(result)result.update().catch(()=>{});else document.getElementById('install-instructions').textContent+=' Não foi possível preparar o modo offline; o app continua disponível com internet.';});
 }
})();
