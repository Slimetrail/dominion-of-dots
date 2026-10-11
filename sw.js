// Network-first service worker, versioned cache; falls back to cache offline.
const VER="1",CACHE="dod-v"+VER;
const SHELL=["./","index.html","game.js?v=1","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("dod-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
 e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res})
 .catch(()=>caches.match(r,{ignoreSearch:r.mode==="navigate"}).then(m=>m||(r.mode==="navigate"?caches.match("index.html"):Response.error()))))});
