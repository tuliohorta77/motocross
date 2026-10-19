// Busca sempre a versão nova quando há internet; sem internet, usa a cópia guardada
const CACHE='fliperama-v9';
const FILES=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png',
  'deserto/','deserto/index.html','deserto/thumb.png','estrada/','estrada/index.html','estrada/thumb.png','patinhos/','patinhos/index.html','patinhos/thumb.png','argola/','argola/index.html','argola/thumb.png','penalti/','penalti/index.html','penalti/thumb.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{
    if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
    return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
