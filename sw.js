const base=new URL('.',self.location.href);let files=null,expires=0;
let waiters=[];
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 event.waitUntil((async()=>{
  const client=event.source;if(!client?.url||!client.url.startsWith(base.href)){event.ports[0]?.postMessage({error:'Origem inválida.'});return;}
  if(event.data.type==='unlock'){files=event.data.files;expires=Date.now()+8*3600000;for(const resolve of waiters)resolve();waiters=[];event.ports[0]?.postMessage({ok:true});}
  if(event.data.type==='lock'){files=null;expires=0;event.ports[0]?.postMessage({ok:true});}
 })());
});
const types={html:'text/html; charset=utf-8',js:'application/javascript',mjs:'application/javascript',css:'text/css',py:'text/plain; charset=utf-8',png:'image/png',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2'};
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname+'_app/'))return;
 event.respondWith((async()=>{
  const client=await self.clients.get(event.clientId);if(client&&!client.url.startsWith(base.href))return new Response('Acesso restrito.',{status:403});
  if(!files||Date.now()>expires){files=null;await new Promise(async resolve=>{waiters.push(resolve);const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const view of clients)if(view.url.startsWith(base.href))view.postMessage({type:'cs-hydrate'});setTimeout(resolve,3000);});if(!files)return event.request.mode==='navigate'?Response.redirect(base.href,302):new Response('Entre novamente no Hub.',{status:401});}
  const name=decodeURIComponent(url.pathname.slice((base.pathname+'_app/').length));const value=files[name];
  if(!value)return new Response('Arquivo não encontrado.',{status:404});
  const content=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  return new Response(content,{headers:{'Content-Type':types[name.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
 })());
});
