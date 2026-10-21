import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../dist',import.meta.url)));
const reviewPage=fileURLToPath(new URL('./cockpit-review.html',import.meta.url));
const port=Number(process.env.PORT||4177);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
// This fixture is injected only by the local server's explicit review query.
// It is never written into dist or shipped with a public site.
const reviewBootstrap=`<script>
(()=>{
 const data=new Map();
 const memory={getItem:key=>data.has(String(key))?data.get(String(key)):null,setItem:(key,value)=>data.set(String(key),String(value)),removeItem:key=>data.delete(String(key)),clear:()=>data.clear(),key:index=>[...data.keys()][index]??null,get length(){return data.size;}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:memory});
 window.__cockpitReviewStorageIsolated=true;
 window.__cockpitReviewErrors=[];
 addEventListener('error',event=>{window.__cockpitReviewErrors.push(event.message||('Resource error: '+(event.target?.src||event.target?.href||'unknown')));},true);
 addEventListener('unhandledrejection',event=>window.__cockpitReviewErrors.push(String(event.reason?.stack||event.reason)));
 const error=console.error.bind(console);console.error=(...args)=>{window.__cockpitReviewErrors.push(args.map(String).join(' '));error(...args);};
 const request=requestAnimationFrame.bind(window),waiting=new Set();let frozen=false;
 function schedule(callback){return request(time=>{if(frozen)waiting.add(callback);else callback(time);});}
 window.requestAnimationFrame=schedule;
 window.__cockpitReviewSetFrozen=value=>{frozen=!!value;if(!frozen){const queued=[...waiting];waiting.clear();queued.forEach(schedule);}};
})();
</script>`;
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
  let file,body,type;
  if(pathname==='/__qa__/cockpit-review.html'){
   file=reviewPage;type=types['.html'];body=await readFile(file);
  }else{
   file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   type=types[path.extname(file)]||'application/octet-stream';body=await readFile(file);
   if(path.extname(file)==='.html'&&url.searchParams.get('qa')==='1'&&url.searchParams.get('review')==='1'){
    body=body.toString('utf8').replace('<head>','<head>'+reviewBootstrap)
     .replace(/<script type="module" src="([^"]+)"><\/script>/g,(_,src)=>'<script type="module">if(!window.__cockpitReviewStorageIsolated)throw Error("Review storage isolation failed");await import('+JSON.stringify(src)+');</script>');
   }
  }
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+' | Review: /__qa__/cockpit-review.html'));
