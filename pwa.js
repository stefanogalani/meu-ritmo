'use strict';
(() => {
 let installPrompt=null,registration=null,applying=false;
 const button=document.getElementById('install-app'),help=document.getElementById('install-dialog');
 const notice=document.getElementById('update-notice'),text=document.getElementById('update-text'),apply=document.getElementById('apply-update'),check=document.getElementById('check-update');
 function announce(message,ready=false){notice.hidden=false;text.textContent=message;apply.hidden=!ready;}
 const ready=()=>announce('Uma nova versão do Meu Ritmo está pronta.',true);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;button.hidden=false;});
 button.onclick=async()=>{if(!installPrompt)return;button.disabled=true;try{await installPrompt.prompt();const result=await installPrompt.userChoice;if(result.outcome==='accepted')button.hidden=true;installPrompt=null;}catch{help.showModal();}finally{button.disabled=false;}};
 window.addEventListener('appinstalled',()=>{button.hidden=true;installPrompt=null;});
 document.getElementById('install-help').onclick=()=>help.showModal();
 document.getElementById('install-close').onclick=()=>help.close();
 check.onclick=async()=>{if(!registration){announce('Ainda não foi possível preparar as atualizações. Confira sua conexão e reabra o app.');return;}check.disabled=true;try{await registration.update();if(registration.waiting)ready();else if(registration.installing)announce('Preparando atualização…');else announce('Você está usando a versão mais recente disponível.');}catch{announce('Não foi possível verificar a atualização. Confira sua conexão e tente novamente.');}finally{check.disabled=false;}};
 apply.onclick=()=>{if(!registration?.waiting)return;if(!window.meuRitmoCanUpdate?.()){announce('Há uma operação ou alterações pendentes. Aguarde a sincronização antes de atualizar. Suas cópias locais serão preservadas.',true);return;}applying=true;apply.disabled=true;announce('Atualizando o Meu Ritmo…');registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});};
 if('serviceWorker' in navigator&&window.isSecureContext&&/^https?:$/.test(location.protocol)){
  // Other tabs are never forcibly reloaded: they may still contain unsent edits.
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applying)location.reload();});
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(result=>{
   registration=result;
   if(registration.waiting)ready();
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)ready();});});
   registration.update().catch(()=>{});
  }).catch(()=>{document.getElementById('install-instructions').textContent+=' Não foi possível preparar o modo offline neste navegador; o app continua disponível com internet.';});
 }else check.hidden=true;
})();
