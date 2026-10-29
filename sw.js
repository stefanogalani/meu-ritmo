'use strict';
const CACHE='meu-ritmo-shell-v1';
const SHELL=['./','index.html','app.js','cloud.js','cloud-config.js','pwa.js','manifest.webmanifest','vendor/supabase-2.118.0.js','assets/meu-ritmo-logo.png','assets/app-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
// Updates activate on next visit after all existing app tabs have been closed.
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('meu-ritmo-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Never cache Supabase requests, OAuth responses, session tokens or user data.
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.search||!url.pathname.startsWith(new URL('./',self.location.href).pathname))return;
 const known=SHELL.some(path=>new URL(path,self.location.href).pathname===url.pathname);
 if(!known)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request);if(cached)return cached;return fetch(event.request);})());
});
