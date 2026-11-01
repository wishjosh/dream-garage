import {createServer} from 'node:net';
const port=4187,url=`http://127.0.0.1:${port}/studies/circuit-elevation/`;
console.log(`Circuit study: ${url}`);
let response=null;
try{response=await fetch(url,{signal:AbortSignal.timeout(2500)});}catch{}
if(response){
 const body=await response.text();
 if(response.ok&&body.includes('data-scenario="pit"')&&body.includes('<title>스피드 링 · 독립 지형 주행</title>')&&body.includes('LOCAL STUDY')){
  console.log('The local study server is already running. Open the link above.');
 }else{
  console.error('Port 4187 is used by another page. No process was changed.');process.exitCode=1;
 }
}else{
 const probe=createServer();
 try{
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve);});
  await new Promise(resolve=>probe.close(resolve));
  process.env.PORT=String(port);await import('./serve.mjs');
  console.log('Keep this window open while driving. Ctrl+C stops this local server.');
 }catch(error){console.error(`Cannot start local study: ${error.message}`);process.exitCode=1;}
}
