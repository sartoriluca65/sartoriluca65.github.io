// PienoSmart: always prefer latest online app, never store old HTML.
const VERSION='pienosmart-20261013-call-hours1';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('pienosmart-'))await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;if(req.mode==='navigate'){event.respondWith(fetch(new Request(req,{cache:'no-store'})).catch(()=>fetch(req)));return}if(new URL(req.url).origin===self.location.origin){event.respondWith(fetch(new Request(req,{cache:'no-store'})).catch(()=>fetch(req)));}});
