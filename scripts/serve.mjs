import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../dist',import.meta.url)));
const reviewPage=fileURLToPath(new URL('./cockpit-review.html',import.meta.url));
const saveReviewPage=fileURLToPath(new URL('./save-review.html',import.meta.url));
const studyReviewPage=fileURLToPath(new URL('./study-review.html',import.meta.url));
const port=Number(process.env.PORT||4177);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
// This fixture is injected only by the local server's explicit review query.
// It is never written into dist or shipped with a public site.
const reviewBootstrap=`<script>
(()=>{
 const persistReview=new URLSearchParams(location.search).get('review-persist')==='1'&&parent!==window;
 const data=persistReview?(parent.__dreamGarageReviewMemory??=new Map()):new Map();
 const memory={getItem:key=>data.has(String(key))?data.get(String(key)):null,setItem:(key,value)=>data.set(String(key),String(value)),removeItem:key=>data.delete(String(key)),clear:()=>data.clear(),key:index=>[...data.keys()][index]??null,get length(){return data.size;}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:memory});
 window.__cockpitReviewStorageIsolated=true;
 if(new URLSearchParams(location.search).get('handling-save')==='1'&&!data.has('hojin-city-gp:save:v1')){
  const stock={paint:'paint-stock',wheels:'wheels-stock',engine:'engine-stock',tires:'tires-stock',brakes:'brakes-stock'};
  const fixture={version:1,coins:4321,races:12,best:{tavaculo:29.5,f2002:28.75},car:'tavaculo',view:'cockpit',assist:false,auto:false,
   owned:[...Object.values(stock),'paint-mint','wheels-gold','engine-sprint','tires-grip','brakes-sport','paint-violet'],
   garage:{tavaculo:{paint:'paint-mint',wheels:'wheels-gold',engine:'engine-sprint',tires:'tires-grip',brakes:'brakes-sport'},f2002:{...stock,paint:'paint-violet'}}};
  memory.setItem('hojin-city-gp:save:v1',JSON.stringify(fixture));window.__citySaveFixture=fixture;
 }

 window.__cockpitReviewErrors=[];
 addEventListener('error',event=>{window.__cockpitReviewErrors.push(event.message||('Resource error: '+(event.target?.src||event.target?.href||'unknown')));},true);
 addEventListener('unhandledrejection',event=>window.__cockpitReviewErrors.push(String(event.reason?.stack||event.reason)));
 const error=console.error.bind(console);console.error=(...args)=>{window.__cockpitReviewErrors.push(args.map(String).join(' '));error(...args);};
 // Test-only loading pause: enabled solely inside an isolated local review.
 if(new URLSearchParams(location.search).get('slow-assets')==='1'){
  const originalFetch=window.fetch.bind(window);
  const state=window.__cockpitReviewSlowAsset={enabled:true,started:false,completed:false,url:null,delayMs:1000};
  window.fetch=async(input,options)=>{
   const url=typeof input==='string'?input:input.url||String(input);
   if(!state.started&&new URL(url,location.href).pathname.endsWith('.glb')){
    state.started=true;state.url=new URL(url,location.href).pathname;state.startedAt=performance.now();
    await new Promise(resolve=>setTimeout(resolve,state.delayMs));state.completed=true;state.completedAt=performance.now();
   }
   return originalFetch(input,options);
  };
 }
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
  if(pathname==='/__qa__/ferrari-main-review.html'){
   file=fileURLToPath(new URL('./ferrari-main-review.html',import.meta.url));type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/safety-review.html'){
   file=fileURLToPath(new URL('./safety-review.html',import.meta.url));type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/console-review.html'){
   file=fileURLToPath(new URL('./console-review.html',import.meta.url));type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/hud-review.html'){
   file=fileURLToPath(new URL('./hud-review.html',import.meta.url));type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/layout-review.html'){
   file=fileURLToPath(new URL('./layout-review.html',import.meta.url));type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/handling-review.html'){
   file=fileURLToPath(new URL('./handling-review.html',import.meta.url));type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/study-review.html'){
   file=studyReviewPage;type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/save-review.html'){
   file=saveReviewPage;type=types['.html'];body=await readFile(file);
  }else if(pathname==='/__qa__/cockpit-review.html'){
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
