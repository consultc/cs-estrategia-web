const base=new URL('.',import.meta.url),status=document.getElementById('status'),login=document.getElementById('login'),workspace=document.getElementById('workspace'),frame=document.getElementById('app');
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const to64=bytes=>btoa(String.fromCharCode(...bytes));let credential=null;
const frames=new Map();
let bundleFiles=null;
const registration=await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'});
await navigator.serviceWorker.ready;
if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
function send(message){return new Promise((resolve,reject)=>{const channel=new MessageChannel();channel.port1.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);navigator.serviceWorker.controller.postMessage(message,[channel.port2]);});}
async function route(){await send({type:'unlock',files:bundleFiles});const requested=location.hash.slice(1);const name=['auditoria','recuperacao','estudo-economico','reestruturacao-passivo'].includes(requested)?requested:'hub';let target=frames.get(name);if(!target){target=frames.size?document.createElement('iframe'):frame;target.title='C&S Estratégia · '+name;target.src=new URL('_app/'+name+'/index.html',base);if(target!==frame)workspace.append(target);frames.set(name,target);}for(const [key,view] of frames)view.hidden=key!==name;}
async function unlock(password,saved){
 status.textContent='Abrindo as ferramentas…';
 const res=await fetch(new URL('payload.json',base),{cache:'no-store'});if(!res.ok)throw Error('Distribuição indisponível. Tente recarregar.');const pack=await res.json();
 if(saved&&saved.salt===pack.salt)credential=saved;
 else{const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:un64(pack.salt),iterations:pack.iterations,hash:'SHA-256'},material,256);credential={key:to64(new Uint8Array(bits)),salt:pack.salt,iterations:pack.iterations};}
 const key=await crypto.subtle.importKey('raw',un64(credential.key),'AES-GCM',false,['decrypt']);
 let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(pack.iv)},key,un64(pack.data));}catch{credential=null;throw Error('Senha incorreta.');}
 const bundle=JSON.parse(new TextDecoder().decode(plain));
 bundleFiles=bundle.files;await send({type:'unlock',files:bundleFiles});sessionStorage.setItem('cs-pages-key',JSON.stringify(credential));
 login.hidden=true;workspace.hidden=false;document.title='HUB C&S Estratégia';route();
}
document.getElementById('access').onsubmit=async event=>{event.preventDefault();const button=document.getElementById('enter');button.disabled=true;try{await unlock(document.getElementById('password').value,null);document.getElementById('password').value='';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
document.getElementById('logout').onclick=async()=>{sessionStorage.removeItem('cs-pages-key');credential=null;bundleFiles=null;for(const view of frames.values())view.src='about:blank';await send({type:'lock'});location.replace(base);};
navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='cs-hydrate'&&bundleFiles&&credential)send({type:'unlock',files:bundleFiles});});
window.addEventListener('hashchange',()=>{if(credential)route();});
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='cs-route'&&credential)location.hash=event.data.route;});
const saved=JSON.parse(sessionStorage.getItem('cs-pages-key')||'null');if(saved)unlock('',saved).catch(error=>{sessionStorage.removeItem('cs-pages-key');status.textContent=error.message;});
