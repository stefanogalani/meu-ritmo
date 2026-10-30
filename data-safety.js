'use strict';
// Conservative upper bound for PostgreSQL jsonb::text (spaces and expanded numbers).
window.meuRitmoDataBytes = data => {
 const json=JSON.stringify(data).replace(/[:,]/g,'$& ').replace(/-?\d+(?:\.\d+)?e[+-]?\d+/gi,match=>'0'.repeat(Math.max(400,match.length)));
 return new TextEncoder().encode(json).length;
};
window.meuRitmoDataFits = data => window.meuRitmoDataBytes(data)<=1900000;
window.meuRitmoSizeMessage='Esta cópia ultrapassa o limite seguro de sincronização (1,9 MB). Exporte um backup e reduza tarefas, lixeira ou histórico antes de sincronizar.';

// Three-way merge: a field changed on one side can be combined; two different
// edits of the same record require a person. Never guess a winner.
window.meuRitmoMerge=(base,local,remote)=>{
 const conflicts=[],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!base)return {conflicts:['Esta cópia antiga não tem uma versão de origem para comparação.'],merged:null};
 function choose(b,l,r,label){if(same(l,r))return l;if(same(b,l))return r;if(same(b,r))return l;conflicts.push(label);return l;}
 const merged={};
 for(const field of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
  if(['tasks','sessions','trash'].includes(field)){
   const key=item=>field==='trash'?item.task.id:item.id;
   const maps=[base,local,remote].map(doc=>{const items=doc[field]||[];const map=new Map(items.map(item=>[key(item),item]));if(map.size!==items.length)conflicts.push(field+': identificadores duplicados');return map;});
   const ids=new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()]);merged[field]=[];
   for(const id of ids){const value=choose(maps[0].get(id),maps[1].get(id),maps[2].get(id),field+': '+(maps[1].get(id)?.text||maps[2].get(id)?.text||id));if(value!==undefined)merged[field].push(value);}
  }else{const value=choose(base[field],local[field],remote[field],field==='notes'?'Notas alteradas nas duas cópias':field);if(value!==undefined)merged[field]=value;}
 }
 const active=new Set((merged.tasks||[]).map(t=>t.id));if((merged.trash||[]).some(e=>active.has(e.task.id)))conflicts.push('Uma tarefa foi movida para a lixeira em outra cópia.');
 const today=new Date(),day=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
 if((merged.tasks||[]).filter(t=>t.dayPriority===day).length>3)conflicts.push('As cópias juntas têm mais de três prioridades para hoje.');
 return {merged:conflicts.length?null:merged,conflicts};
};

// Each tab journals first, then commits under a cross-tab Web Lock. Conflicting
// journals survive reload; adopting another version never deletes them implicitly.
window.createLocalStore = ({key,read,show,notify,canAdopt=()=>true}) => {
 const prefix=key+':draft:',writer=crypto.randomUUID(),own=prefix+writer;
 let previousKey=null;try{previousKey=sessionStorage.getItem(prefix+'tab');sessionStorage.setItem(prefix+'tab',own);}catch{}
 let base=null;try{base=localStorage.getItem(key);}catch{}
 let queue=Promise.resolve(),pending=0,conflict=false,active=true;
 const panel=document.getElementById('local-recovery'),select=document.getElementById('local-drafts');
 function drafts(){const entries=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith(prefix))continue;try{const d=JSON.parse(localStorage.getItem(k));if(d&&typeof d.raw==='string')entries.push({key:k,...d});}catch{}}}catch{}return entries.sort((a,b)=>b.time-a.time);}
 function refresh(){
  const chosen=select.value,entries=drafts();select.replaceChildren();
  for(const d of entries){const option=document.createElement('option');option.value=d.key;option.textContent=new Date(d.time).toLocaleString('pt-BR')+(d.key===own?' · esta aba':' · outra cópia');select.append(option);}
  if(entries.some(d=>d.key===chosen))select.value=chosen;
  panel.hidden=!active||(!conflict&&!entries.some(d=>d.key!==own));
 }
 function warn(message){conflict=true;notify(message);refresh();}
 function archiveOwn(except){const raw=localStorage.getItem(own);if(raw&&own!==except){localStorage.setItem(prefix+crypto.randomUUID(),raw);localStorage.removeItem(own);}previousKey=null;}
 function lock(fn){if(!navigator.locks)return Promise.reject(Error('Este navegador não permite salvar com proteção entre abas. Sua cópia foi preservada; exporte um backup.'));return navigator.locks.request(key,fn);}
 function write(data){
  const raw=JSON.stringify(data);try{localStorage.setItem(own,JSON.stringify({raw,time:Date.now(),parents:[base]}));}catch{notify('Não foi possível guardar sua cópia. Exporte um backup antes de fechar.');return false;}
  pending++;
  queue=queue.then(()=>lock(()=>{
   if(JSON.parse(localStorage.getItem(own)||'null')?.raw!==raw)return;
   const current=localStorage.getItem(key);
   if(conflict||current!==base){warn('Outra aba alterou os dados. Sua edição foi preservada em Cópias locais. Exporte ou recupere a cópia desejada.');return;}
   localStorage.setItem(key,raw);base=raw;
   // Do not remove a newer journal queued while this commit was waiting.
   if(JSON.parse(localStorage.getItem(own)||'null')?.raw===raw){localStorage.removeItem(own);if(previousKey){localStorage.removeItem(previousKey);previousKey=null;}}
  })).catch(error=>warn(error.message)).finally(()=>{pending--;refresh();});
  return true;
 }
 document.getElementById('local-latest').onclick=async()=>{
  await queue;try{const raw=localStorage.getItem(key);const data=read(raw);if(!data)throw Error('A cópia principal não pôde ser lida. Exporte uma cópia preservada.');archiveOwn();base=raw;conflict=false;show(data);notify('Cópia principal carregada. As cópias em conflito continuam disponíveis.');refresh();}catch(error){notify(error.message);}
 };
 document.getElementById('local-recover').onclick=async()=>{
  const selected=drafts().find(d=>d.key===select.value);if(!selected)return;
  const data=read(selected.raw);if(!data){notify('Cópia incompatível. Exporte o arquivo para recuperação.');return;}
  if(!confirm('Recuperar esta cópia como versão principal? As outras cópias preservadas continuarão disponíveis.'))return;
  await queue;try{await lock(()=>{archiveOwn(selected.key);base=localStorage.getItem(key);if(base&&base!==selected.raw)localStorage.setItem(prefix+crypto.randomUUID(),JSON.stringify({raw:base,time:Date.now()}));localStorage.setItem(key,selected.raw);base=selected.raw;conflict=false;show(data);localStorage.removeItem(selected.key);});refresh();notify('Cópia recuperada. A versão anterior também foi preservada.');}catch(error){warn(error.message);}
 };
 document.getElementById('local-export').onclick=()=>{
  const selected=drafts().find(d=>d.key===select.value);if(!selected)return;
  const url=URL.createObjectURL(new Blob([selected.raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='meu-ritmo-copia-local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 document.getElementById('local-discard').onclick=()=>{const selected=select.value;if(selected&&confirm('Excluir apenas esta cópia preservada? Exporte antes, se precisar.')){localStorage.removeItem(selected);refresh();}};
 window.addEventListener('storage',event=>{if(event.key===key&&event.newValue!==base){if(pending||localStorage.getItem(own)||active&&!canAdopt())warn('Outra aba salvou alterações. Sua edição foi mantida nesta aba; termine ou cancele a edição antes de escolher a versão principal.');else{base=event.newValue;const data=read(base);if(data&&active)show(data);}}if(event.key?.startsWith(prefix))refresh();});
 try{const previous=previousKey&&JSON.parse(localStorage.getItem(previousKey));if(previous){const data=read(previous.raw);if(data&&(previous.parents||[]).includes(base)){show(data);write(data);}else if(previous.raw!==base){previousKey=null;warn('Há uma edição preservada desta aba. Escolha a cópia local que deseja recuperar.');}}}catch{}
 refresh();
 return {write,canUpdate:()=>pending===0&&!conflict,setActive(value){active=value;refresh();},flush:()=>queue};
};
