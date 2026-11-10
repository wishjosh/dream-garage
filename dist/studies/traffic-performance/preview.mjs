import * as T from '../../vendor/three.module.js';
import {loadVehicles,dressCar} from '../../main-vehicles.mjs?v=marina-city-1';
import {createOriginalCockpit} from '../mixed-city/cockpit.mjs?v=marina-city-1';
import {createRearView} from '../../rear-view.mjs?v=traffic-1';
import {prepareRaceVisual,createMirrorSchedule} from '../../race-rendering.mjs?v=traffic-1';
import {splitWheelVisuals} from '../../wheel-visual.mjs';
import {createMarinaCourse} from '../../marina-city/plan.mjs';
import {buildMarinaCity} from '../../marina-city/scene.mjs';
import {trackFrame} from '../../race-core.mjs';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
const $=s=>document.querySelector(s),renderer=new T.WebGLRenderer({canvas:$('#scene'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.info.autoReset=false;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,2,.12,700);scene.add(camera);
const track=createMarinaCourse(),anchor=trackFrame(track,80),heading=Math.atan2(anchor.tx,anchor.tz),quat=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading);
let ready=false,optimized=true,pack='pack',view='chase',selected='tavaculo',actors=[],mirrors={},cabins,player,city,run=null,previous=null,lastStats=null;const rows=[],schedule=createMirrorSchedule();
document.querySelectorAll('nav button,nav select').forEach(b=>b.disabled=true);
const labels={pack:'밀집',spread:'분산'},quantile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]||0;
function setStyle(value){optimized=value;actors.forEach((a,i)=>a.optimization.setOptimized(value,{player:i===(selected==='tavaculo'?0:1)}));$('#before').setAttribute('aria-pressed',String(!value));$('#after').setAttribute('aria-pressed',String(value));}
function arrange(){
 setStyle(optimized);
 actors.forEach((a,i)=>{a.root.visible=false;});const order=selected==='tavaculo'?[0,1,2,3]:[1,0,3,2];
 order.forEach((id,i)=>{const a=actors[id],distance=i===0?0:(pack==='pack'?6+i*3:30+i*20),lane=i%2?2.3:-2.3,f=trackFrame(track,80+distance);a.root.position.set(f.x+f.rx*lane,.045,f.z+f.rz*lane);a.root.rotation.y=Math.atan2(f.tx,f.tz);a.root.visible=!(view==='cockpit'&&i===0);});
 const a=actors[order[0]],fwd=new T.Vector3(anchor.tx,0,anchor.tz),right=new T.Vector3(anchor.rx,0,anchor.rz);player={x:a.root.position.x,y:.045,z:a.root.position.z,heading,quaternion:quat.toArray(),speed:0,forwardSpeed:0};
 Object.values(cabins).forEach(c=>c.group.visible=false);
 if(view==='cockpit'){const c=cabins[selected];c.group.visible=true;c.mirrorMount.visible=innerWidth>=innerHeight;c.update({player,paint:selected==='tavaculo'?'#ff0000':'#e8e9e5'});c.applyCamera();}
 else{const side=view==='side'||view==='rival',focus=view==='rival'?actors[order[1]].root.position:a.root.position;camera.up.set(0,1,0);camera.near=.12;camera.fov=side?40:62;camera.position.copy(focus).addScaledVector(fwd,side?4:-6.5).addScaledVector(right,side?6:0);camera.position.y=side?1.7:2.95;camera.lookAt(focus.clone().addScaledVector(fwd,side?0:7).add(new T.Vector3(0,.9,0)));}
 camera.updateProjectionMatrix();
}
function resize(){renderer.setSize($('#scene').clientWidth,$('#scene').clientHeight,false);camera.aspect=$('#scene').clientWidth/$('#scene').clientHeight;if(ready)arrange();camera.updateProjectionMatrix();}
function statsTable(){ $('#results').innerHTML=rows.map(r=>`<tr><td>${r.style==='optimized'?'개선':'기존'} · ${labels[r.spacing]}</td><td>${r.frameMedianMs.toFixed(1)}ms</td><td>${r.frameP95Ms.toFixed(1)}ms</td><td>${Math.round(r.drawCalls)}</td><td>${Math.round(r.triangles).toLocaleString()}</td></tr>`).join('');$('#details').textContent=JSON.stringify({scope:'stationary rendering comparison; not driving or physical iPhone verification',userAgent:navigator.userAgent,rows,geometry:actors.map(a=>a.optimization.stats())},null,2);$('#copy').disabled=!rows.length||!!run;}
function finishSample(now){const s=run.samples;rows.push({style:optimized?'optimized':'original',spacing:pack,view,car:selected,width:renderer.domElement.clientWidth,height:renderer.domElement.clientHeight,pixelRatio:renderer.getPixelRatio(),frames:s.length,focusedFrames:s.filter(s=>s.focused).length,frameMedianMs:quantile(s.map(s=>s.dt),.5),frameP95Ms:quantile(s.map(s=>s.dt),.95),over33ms:s.filter(s=>s.dt>33.4).length,cpuSubmitMedianMs:quantile(s.map(s=>s.cpu),.5),cpuSubmitP95Ms:quantile(s.map(s=>s.cpu),.95),drawCalls:s.reduce((n,s)=>n+s.calls,0)/Math.max(1,s.length),triangles:s.reduce((n,s)=>n+s.triangles,0)/Math.max(1,s.length)});statsTable();run.index++;if(run.index===run.cases.length){run=null;$('#status').textContent='비교 완료 · 이 기기의 표시 성능 결과입니다.';document.querySelectorAll('nav button,nav select').forEach(b=>b.disabled=false);return;}nextSample(now);}
function nextSample(now){const c=run.cases[run.index];pack=c.pack;$('#spacing').value=pack;setStyle(c.optimized);arrange();run.start=now;run.samples=[];previous=null;}
function frame(now){requestAnimationFrame(frame);if(!ready||document.hidden){previous=null;if(run){run=null;$('#status').textContent='화면이 숨겨져 측정을 중단했습니다. 다시 비교해 주세요.';document.querySelectorAll('nav button,nav select').forEach(b=>b.disabled=false);}return;}
 const dt=previous===null?0:now-previous;previous=now;const start=performance.now();renderer.info.reset();
 for(const [key,ms] of Object.entries(mirrors))schedule.run(ms,{player,enabled:view==='cockpit'&&key===selected,now,frameMs:16,hide:actors.map(a=>a.root).filter((_,i)=>i===(selected==='tavaculo'?0:1)).concat(Object.values(cabins).map(c=>c.group)),portrait:innerHeight>innerWidth,viewportWidth:renderer.domElement.clientWidth,viewportHeight:renderer.domElement.clientHeight},{optimized});
 renderer.render(scene,camera);lastStats={dt,focused:document.hasFocus(),cpu:performance.now()-start,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
 if(run){if(now-run.start>=1000&&dt>0)run.samples.push(lastStats);$('#status').textContent=`측정 ${run.index+1}/4 · ${optimized?'개선':'기존'} · ${labels[pack]} · ${Math.max(0,Math.ceil((6000-now+run.start)/1000))}초`;if(now-run.start>=6000)finishSample(now);}
}
try{
 const fleet=await loadVehicles();scene.environment=fleet.assets.environment;city=await buildMarinaCity(scene,track,{renderer});cabins=await createOriginalCockpit({scene,camera,loader:new GLTFLoader()});
 for(const kind of ['tavaculo','porsche','tavaculo','porsche']){const rig=kind==='porsche'?fleet.porsche.rig:fleet.rig,body=(kind==='porsche'?fleet.porsche.exterior:fleet.exterior).clone(true);dressCar(body,kind,{paint:'paint-stock',wheels:'wheels-stock'},rig);const {wheels,calipers}=splitWheelVisuals(body,rig),root=new T.Group();root.add(body,...wheels,...calipers);wheels.forEach((w,i)=>w.position.fromArray(rig.wheels[i].position));calipers.forEach((w,i)=>w.position.fromArray(rig.wheels[i].position));const optimization=prepareRaceVisual({body,wheels,calipers,opponent:true});scene.add(root);actors.push({root,body,optimization});}
 mirrors=Object.fromEntries(Object.entries(cabins).map(([kind,c])=>[kind,[createRearView({renderer,scene,camera,cockpit:c.group,surface:c.mirrorSurface}),...c.sideMirrors.map(m=>createRearView({renderer,scene,camera,cockpit:c.group,surface:m.surface,options:{name:kind+'-'+m.id,origin:m.origin,aspect:m.aspect,yaw:m.yaw,width:192,height:96,hz:10,allowOverlay:false,cullOffscreen:true}}))]]));
 ready=true;resize();setStyle(true);$('#status').textContent='준비 완료 · 같은 위치에서 기존과 개선을 바꿔 보세요.';document.querySelectorAll('nav button,nav select').forEach(b=>b.disabled=false);$('#copy').disabled=true;requestAnimationFrame(frame);
}catch(e){$('#status').textContent='불러오지 못했습니다. 새로고침해 주세요.';console.error(e);}
$('#before').onclick=()=>setStyle(false);$('#after').onclick=()=>setStyle(true);$('#spacing').onchange=e=>{pack=e.target.value;arrange();};$('#view').onchange=e=>{view=e.target.value;arrange();};$('#car').onchange=e=>{selected=e.target.value;arrange();};
$('#measure').onclick=()=>{rows.length=0;statsTable();document.querySelectorAll('nav button,nav select').forEach(b=>b.disabled=true);run={index:0,cases:[{pack:'pack',optimized:false},{pack:'pack',optimized:true},{pack:'spread',optimized:true},{pack:'spread',optimized:false}]};nextSample(performance.now());};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#details').textContent);$('#status').textContent='측정 결과를 복사했습니다.';}catch{$('#status').textContent='아래 측정 세부 정보를 펼쳐 복사해 주세요.';}};new ResizeObserver(resize).observe($('#scene'));
