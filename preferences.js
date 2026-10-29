'use strict';
(() => {
 const key='meu-ritmo-preferences-v1',media=matchMedia('(prefers-color-scheme: dark)');
 const defaults={theme:'auto',focusMinutes:25,breakMinutes:5};
 function read(){try{const p=JSON.parse(localStorage.getItem(key));return {theme:['auto','light','dark'].includes(p?.theme)?p.theme:'auto',focusMinutes:[15,25,50].includes(p?.focusMinutes)?p.focusMinutes:25,breakMinutes:[5,10,15].includes(p?.breakMinutes)?p.breakMinutes:5};}catch{return {...defaults};}}
 let prefs=read();
 function apply(){const dark=prefs.theme==='dark'||prefs.theme==='auto'&&media.matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';const button=document.getElementById('theme-toggle');if(button){const labels={auto:'Automático',light:'Claro',dark:'Escuro'};button.textContent='Tema: '+labels[prefs.theme];button.setAttribute('aria-label','Alternar tema. Atual: '+labels[prefs.theme]);}document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#121e1b':'#173f36');}
 window.meuRitmoPreferences=()=>({...prefs});
 window.setMeuRitmoPreferences=patch=>{prefs={...prefs,...patch};try{localStorage.setItem(key,JSON.stringify(prefs));}catch{document.getElementById('message')?.replaceChildren(document.createTextNode('Não foi possível guardar as preferências neste navegador.'));}apply();window.dispatchEvent(new CustomEvent('ritmo-preferences',{detail:{...prefs}}));};
 media.addEventListener('change',apply);
 window.addEventListener('storage',event=>{if(event.key===key){prefs=read();apply();window.dispatchEvent(new CustomEvent('ritmo-preferences',{detail:{...prefs}}));}});
 apply();document.addEventListener('DOMContentLoaded',()=>{apply();document.getElementById('theme-toggle').onclick=()=>{const themes=['auto','light','dark'];window.setMeuRitmoPreferences({theme:themes[(themes.indexOf(prefs.theme)+1)%themes.length]});};});
})();
