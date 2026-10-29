'use strict';
(() => {
 let installPrompt=null;
 const button=document.getElementById('install-app'),help=document.getElementById('install-dialog');
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;button.hidden=false;});
 button.onclick=async()=>{if(!installPrompt)return;button.disabled=true;try{await installPrompt.prompt();const result=await installPrompt.userChoice;if(result.outcome==='accepted')button.hidden=true;installPrompt=null;}catch{help.showModal();}finally{button.disabled=false;}};
 window.addEventListener('appinstalled',()=>{button.hidden=true;installPrompt=null;});
 document.getElementById('install-help').onclick=()=>help.showModal();
 document.getElementById('install-close').onclick=()=>help.close();
 if('serviceWorker' in navigator&&window.isSecureContext&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('./sw.js').then(registration=>{
   const notice=()=>{document.getElementById('message').textContent='Uma nova versão está pronta. Após sincronizar, feche todas as abas do Meu Ritmo e abra novamente para atualizar.';};
   if(registration.waiting)notice();
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notice();});});
  }).catch(()=>{document.getElementById('install-instructions').textContent+=' Não foi possível preparar o modo offline neste navegador; o app continua disponível com internet.';});
 }
})();
