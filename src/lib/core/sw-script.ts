type WorkerConfig={version:string;push:null|{firebase:{projectId:string;apiKey:string;appId:string;messagingSenderId:string}}};
export function buildServiceWorker({version,push}:WorkerConfig):string {
 return `
const STATIC=${JSON.stringify('cc-static-'+version)}, OFFLINE=${JSON.stringify('cc-offline-'+version)};
const publicAsset=p=>p.startsWith('/_next/static/')||p.startsWith('/pwa-icon/')||p==='/cc-mark.svg';
self.addEventListener('install',event=>event.waitUntil(Promise.all([
 caches.open(OFFLINE).then(c=>c.add('/offline')),
 caches.open(STATIC).then(c=>c.addAll(['/cc-mark.svg','/pwa-icon/192?v=1']))
])));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('cc-')&&name!==STATIC&&name!==OFFLINE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='CLEAR_CACHES')event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('cc-'))await caches.delete(name)})());
});
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin||r.headers.has('Range')||r.headers.has('RSC')||r.headers.has('Next-Router-Prefetch')||u.searchParams.has('_rsc')||u.pathname==='/api'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/_next/data/'))return;
 if(publicAsset(u.pathname)){
  event.respondWith((async()=>{const c=await caches.open(STATIC),hit=await c.match(r);if(hit)return hit;const response=await fetch(r);if(response.ok&&!response.redirected&&response.type!=='opaque'&&!response.headers.get('Cache-Control')?.includes('private')&&!response.headers.get('Cache-Control')?.includes('no-store'))await c.put(r,response.clone()).catch(()=>{});return response})());return;
 }
 if(r.mode==='navigate')event.respondWith((async()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{return await fetch(r,{signal:controller.signal})}catch{
   return await caches.match('/offline')||new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>CampusConnect offline</title><body style="background:#080a0e;color:white;font:18px system-ui;padding:2rem"><h1>CampusConnect</h1><p>You are offline. Reconnect and reload.</p><a style="color:white" href="/home">Try again</a></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
  }finally{clearTimeout(timeout)}
 })());
});
`+(push?`
self.addEventListener('notificationclick',event=>{
 event.notification.close();const path=event.notification.data?.kind==='message'?'/messages':'/notifications';
 event.waitUntil((async()=>{for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true})){if(new URL(c.url).origin===self.location.origin){await c.navigate(path);return c.focus()}}return self.clients.openWindow(path)})());
});
importScripts('https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(push.firebase)});
firebase.messaging().onBackgroundMessage(async payload=>{
 const kind=payload.data?.kind==='message'?'message':'activity';
 await self.registration.showNotification('CampusConnect',{body:'You have new activity. Open CampusConnect to view it.',tag:'cc-'+kind,data:{kind},icon:'/pwa-icon/192?v=1',badge:'/pwa-icon/96?v=1'});
 try{const response=await fetch('/api/notifications/summary',{credentials:'same-origin',cache:'no-store'});if(response.ok){const data=await response.json();await self.navigator.setAppBadge?.((Number(data.unread)||0)+(Number(data.unreadMessages)||0))}}catch{}
});
`:'');
}
