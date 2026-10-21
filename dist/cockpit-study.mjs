import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createSteeringState,stepSteering,MAX_LOOK_DEGREES,MAX_WHEEL_DEGREES} from './cockpit-study-steering.mjs';

const $=id=>document.getElementById(id);
const REFERENCE_ASPECT=844/390;
const BASE_FOV=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(80)/2)/REFERENCE_ASPECT));
const settings={height:0,foreAft:0,verticalFov:BASE_FOV,pitch:-4,glance:'forward'};
const state={asset:'loading',reason:'',model:null,baseline:[],motion:'idle',elapsed:0,distance:0,speed:0,phase:'정지',paused:false,frameMs:16,slowFrames:0,frames:0};
const steering=createSteeringState(),steeringSources=new Map();
let followSteering=true;
const scene=new T.Scene();
scene.background=new T.Color('#b9c5cd');
scene.fog=new T.Fog('#b9c5cd',75,190);
const carRig=new T.Group();carRig.name='study-car-rig';scene.add(carRig);
const camera=new T.PerspectiveCamera(BASE_FOV,innerWidth/innerHeight,.035,220);
camera.name='study-driver-camera';
carRig.add(camera);
const baseEye=new T.Vector3(0,1.05,0);
const baseForward=new T.Vector3(0,0,-1);
const motionForward=new T.Vector3(0,0,-1);
const cameraForward=new T.Vector3(),worldEye=new T.Vector3(),worldLook=new T.Vector3();
const yAxis=new T.Vector3(0,1,0);
const geometries=new Set(),materials=new Set();
let renderer,raf=0,last=performance.now(),lastReadout=0,projectionAtResize=BASE_FOV;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finiteVector=value=>value&&[value.x,value.y,value.z].every(Number.isFinite);

function standard(color,roughness=.8,metalness=0){
 const material=new T.MeshStandardMaterial({color,roughness,metalness});materials.add(material);return material;
}
function makeWorld(){
 scene.add(new T.HemisphereLight('#f0f4f5','#6b7665',2.3));
 const sun=new T.DirectionalLight('#fff5df',2.1);sun.position.set(-12,24,-7);scene.add(sun);
 const fill=new T.DirectionalLight('#c7d9e6',.65);fill.position.set(10,8,12);scene.add(fill);
 const unit=new T.BoxGeometry(1,1,1);geometries.add(unit);
 const road=standard('#5c6367'),concrete=standard('#a7ada8'),mark=standard('#e0e3d8'),earth=standard('#879080'),wall=standard('#a5acac'),dark=standard('#566267');
 function box(w,h,d,x,y,z,material){
  const mesh=new T.Mesh(unit,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);scene.add(mesh);return mesh;
 }
 function repeated(items,material){
  const mesh=new T.InstancedMesh(unit,material,items.length),pose=new T.Object3D();
  for(let i=0;i<items.length;i++){const p=items[i];pose.position.set(...p.position);pose.scale.set(...p.scale);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);}
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);return mesh;
 }
 box(260,.2,360,0,-.19,-95,earth);
 box(8.2,.06,250,0,-.06,-85,road);
 for(const side of [-1,1])box(2.4,.18,250,side*5.4,-.02,-85,concrete);
 const roadMarks=[],curbs=[],posts=[],buildings=[];
 for(let z=15;z>-205;z-=8)roadMarks.push({position:[0,-.024,z],scale:[.10,.006,3]});
 for(let z=18;z>-210;z-=10)for(const side of [-1,1]){
  curbs.push({position:[side*4.18,.06,z],scale:[.14,.14,9.85]});
  posts.push({position:[side*6.8,2.6,z-1],scale:[.08,5.2,.08]});
 }
 for(let i=0;i<16;i++)for(const side of [-1,1]){
  const height=5+(i*7%13),width=6+(i%3);
  buildings.push({position:[side*(14+i%3*3),height/2,-i*17-6],scale:[width,height,9]});
 }
 repeated(roadMarks,mark);repeated(curbs,mark);repeated(posts,dark);repeated(buildings,wall);
 // Low roadside blocks give an ordinary 1 m scale cue; no reflective effects.
 for(const side of [-1,1])box(.8,1,.8,side*5.1,.5,-8,concrete);
}
makeWorld();

function setNotice(title,description,retry=false){
 $('load-notice').hidden=false;$('load-title').textContent=title;$('load-description').textContent=description;$('reload-model').hidden=!retry;
}
function setStatus(kind,label){state.asset=kind;$('model-status').dataset.state=kind;$('model-status').textContent=label;}
function failAsset(error){
 state.model?.root?.removeFromParent();state.model=null;state.baseline=[];
 baseEye.set(0,1.05,0);baseForward.set(0,0,-1);motionForward.set(0,0,-1);resetMotion();
 state.reason=String(error?.message||error||'Unknown model loading failure');
 const pending=error?.code==='ASSET_PENDING'||error?.code==='MODEL_PENDING';
 setStatus(pending?'missing':'error',pending?'원본 대기':'불러오기 실패');
 $('model-source').textContent='차량이 없는 배경 화면입니다.';
 setNotice(pending?'차량 원본을 기다리고 있어요':'차량 원본을 표시할 수 없어요',pending?'원본 파일이 준비되면 이 화면에서 실제 실내의 비례와 시선을 비교할 수 있습니다. 지금은 배경만 표시됩니다.':'원본 파일 준비 또는 불러오기 상태를 확인해 주세요. 지금 보이는 것은 배경뿐이며 차량 시안의 완성 화면이 아닙니다.',true);
 $('steering-controls').disabled=true;clearSteering(true);$('camera-controls').disabled=true;$('play-motion').disabled=true;$('reset-motion').disabled=true;
}
function invariantSnapshot(root){
 const result=[];
 root.traverse(object=>result.push({object,scale:object.scale.clone(),position:object.position.clone(),quaternion:object.quaternion.clone(),geometry:object.geometry,attribute:object.geometry?.attributes.position,version:object.geometry?.attributes.position?.version,count:object.geometry?.attributes.position?.count}));
 return result;
}
function checkInvariant(){
 if(!state.model)return{available:false,passed:false,changed:[]};
 const changed=[];
 for(const base of state.baseline){
  const object=base.object,attribute=object.geometry?.attributes.position;
  if(!object.scale.equals(base.scale)||!object.position.equals(base.position)||!(object===state.model.steeringPivot?state.model.steeringRotationValid?.():object.quaternion.equals(base.quaternion))||object.geometry!==base.geometry||attribute!==base.attribute||attribute?.version!==base.version||attribute?.count!==base.count)changed.push(object.name||object.type);
 }
 return{available:true,passed:changed.length===0,changed};
}
function updateCamera(){
 camera.position.copy(baseEye).addScaledVector(yAxis,settings.height).addScaledVector(baseForward,settings.foreAft);
 const glanceYaw=settings.glance==='left'?38:settings.glance==='right'?-38:0;
 const yaw=T.MathUtils.degToRad(glanceYaw-steering.lookDegrees);
 cameraForward.copy(baseForward).applyAxisAngle(yAxis,yaw).normalize();
 cameraForward.y=Math.sin(T.MathUtils.degToRad(settings.pitch));
 cameraForward.x*=Math.cos(T.MathUtils.degToRad(settings.pitch));cameraForward.z*=Math.cos(T.MathUtils.degToRad(settings.pitch));
 carRig.updateMatrixWorld(true);
 worldEye.copy(camera.position);carRig.localToWorld(worldEye);
 worldLook.copy(camera.position).addScaledVector(cameraForward,10);carRig.localToWorld(worldLook);
 camera.up.set(0,1,0);camera.lookAt(worldLook);
 camera.fov=settings.verticalFov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function steeringTarget(){
 const values=[...steeringSources.values()];return Number(values.includes(1))-Number(values.includes(-1));
}
function refreshSteeringButtons(){
 const values=[...steeringSources.values()];
 document.querySelectorAll('[data-steer]').forEach(button=>button.setAttribute('aria-pressed',String(values.includes(Number(button.dataset.steer)))));
}
function setSteeringInput(source,value){
 if(value&&state.asset==='ready'&&!$('qa-dialog').open)steeringSources.set(source,value<0?-1:1);else steeringSources.delete(source);
 refreshSteeringButtons();
}
function advanceSteering(dt){
 stepSteering(steering,steeringTarget(),dt,followSteering);
 state.model?.setSteeringAngle?.(T.MathUtils.degToRad(steering.amount*MAX_WHEEL_DEGREES));
 updateCamera();
}
function clearSteering(immediate=false){
 steeringSources.clear();
 document.querySelectorAll('[data-steer]').forEach(button=>{for(const id of capturedPointers.get(button)||[])if(button.hasPointerCapture?.(id))button.releasePointerCapture(id);});
 capturedPointers.clear();refreshSteeringButtons();
 if(immediate){Object.assign(steering,createSteeringState());state.model?.setSteeringAngle?.(0);updateCamera();}
}
function resetCamera(){clearSteering(true);setPose({height:0,foreAft:0,verticalFov:BASE_FOV,pitch:-4,glance:'forward'});}
function updateControls(){
 $('eye-height').value=String(settings.height);$('eye-depth').value=String(settings.foreAft);$('lens-fov').value=String(settings.verticalFov);
 const centimeters=(value,positive,negative)=>Math.abs(value)<.001?'기본':(value>0?positive:negative)+' '+Math.abs(value*100).toFixed(1).replace(/\.0$/,'')+' cm';
 $('height-value').value=centimeters(settings.height,'위로','아래로');
 $('depth-value').value=centimeters(settings.foreAft,'앞으로','뒤로');
 $('fov-value').value=settings.verticalFov.toFixed(1)+'°';
 $('gaze-pitch').value=String(settings.pitch);
 $('pitch-value').value=(settings.pitch<0?'아래로 ':'위로 ')+Math.abs(settings.pitch).toFixed(1)+'°';
 document.querySelectorAll('[data-glance]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.glance===settings.glance)));
 $('view-caption').textContent=settings.glance==='left'?'왼쪽 보기':settings.glance==='right'?'오른쪽 보기':'앞 보기';
}
function setPose(values={}){
 if(Number.isFinite(values.height))settings.height=clamp(values.height,-.07,.06);
 if(Number.isFinite(values.foreAft))settings.foreAft=clamp(values.foreAft,-.10,.08);
 if(Number.isFinite(values.verticalFov))settings.verticalFov=clamp(values.verticalFov,30,65);
 if(Number.isFinite(values.pitch))settings.pitch=clamp(values.pitch,-9,3);
 if(['forward','left','right'].includes(values.glance))settings.glance=values.glance;
 updateControls();updateCamera();
}
function sourceLabel(provenance){
 if(typeof provenance==='string')return provenance;
 return provenance?.label||provenance?.description||provenance?.name||'가져온 차량 메시 · 원본 비례 고정';
}
async function loadCar(){
 try{
  const {loadStudyCar}=await import('./cockpit-study-model.mjs');
  if(typeof loadStudyCar!=='function')throw Error('The model adapter does not export loadStudyCar.');
  const result=await loadStudyCar(new GLTFLoader());
  if(!result?.root?.isObject3D||!finiteVector(result.eye)||!finiteVector(result.forward)||result.forward.lengthSq()<.001)throw Error('The model adapter must return a root and valid local eye/forward vectors.');
  state.model=result;
  result.root.name=result.root.name||'study-car-model';
  // The car and eye camera are siblings in one metre-based rig. No part is
  // resized to fit a screen, and the camera never owns the interior.
  carRig.add(result.root);
  baseEye.copy(result.eye);baseForward.copy(result.forward).normalize();
  motionForward.copy(baseForward).setY(0);
  if(motionForward.lengthSq()<.001)throw Error('The model forward vector must point along the road.');
  motionForward.normalize();
  state.baseline=invariantSnapshot(result.root);
  setStatus('ready','원본 준비됨');$('model-source').textContent=sourceLabel(result.provenance);
  $('load-notice').hidden=true;$('steering-controls').disabled=false;$('camera-controls').disabled=false;$('play-motion').disabled=false;$('reset-motion').disabled=false;
  updateCamera();draw();renderReadout();
 }catch(error){failAsset(error);}
}
function motionSample(seconds){
 if(seconds<4)return{speed:2*seconds,distance:seconds*seconds,phase:'가속'};
 if(seconds<7)return{speed:8,distance:16+(seconds-4)*8,phase:'정속'};
 if(seconds<11){const t=seconds-7;return{speed:8-2*t,distance:40+8*t-t*t,phase:'제동'};}
 return{speed:0,distance:56,phase:'정지'};
}
function applyMotion(){
 const sample=motionSample(state.elapsed);state.speed=sample.speed;state.distance=sample.distance;state.phase=state.motion==='idle'?'정지':sample.phase;
 carRig.position.copy(motionForward).multiplyScalar(state.distance);updateCamera();
}
function resetMotion(){
 state.motion='idle';state.elapsed=0;state.speed=0;state.distance=0;state.phase='정지';state.paused=false;carRig.position.set(0,0,0);
 updateCamera();renderReadout();
}
function toggleMotion(){
 if(state.asset!=='ready')return;
 if(state.motion==='playing'){state.motion='paused';state.paused=true;}
 else if(state.motion==='paused'){state.motion='playing';state.paused=false;}
 else{state.elapsed=0;state.motion='playing';state.paused=false;applyMotion();}
 renderReadout();
}
function renderReadout(){
 $('speed-readout').querySelector('b').textContent=String(Math.round(state.speed*3.6));
 $('play-motion').textContent=state.motion==='playing'?'잠깐 멈추기':state.motion==='paused'?'계속 보기':state.motion==='finished'?'다시 미리보기':'가속·제동 미리보기';
 $('motion-state').textContent=(state.motion==='paused'?'일시정지':state.phase)+' · '+(state.distance<.05?'출발 위치':state.distance.toFixed(1)+' m 이동');
}
function draw(){if(renderer)renderer.render(scene,camera);}
function resize(){
 projectionAtResize=camera.fov;
 if(renderer)renderer.setSize(innerWidth,innerHeight);
 camera.aspect=innerWidth/innerHeight;
 // A phone rotation crops the same physical view. It does not resize the
 // interior or silently change the vertical field of view.
 updateCamera();draw();
}
function rawModelStats(){
 if(!state.model)return null;
 try{return typeof state.model.stats==='function'?state.model.stats():state.model.stats||null;}catch{return null;}
}
function snapshot(){
 camera.updateMatrixWorld(true);
 let meshes=0,triangles=0,nonFinite=0;
 state.model?.root.traverse(object=>{
  if(!object.isMesh)return;meshes++;
  const positions=object.geometry?.attributes.position;
  triangles+=(object.geometry?.index?.count||positions?.count||0)/3;
  if(![...object.scale.toArray(),...object.position.toArray(),...object.quaternion.toArray()].every(Number.isFinite))nonFinite++;
 });
 const horizontalFov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov)/2)*camera.aspect));
 return{
  ready:state.asset==='ready',asset:state.asset,error:state.reason,provenance:state.model?.provenance||null,
  viewport:{width:innerWidth,height:innerHeight,pixelRatio:renderer?.getPixelRatio()||0},
  invariant:checkInvariant(),model:{meshes,triangles,nonFinite,adapter:rawModelStats()},
  camera:{eyeLocal:camera.position.toArray(),eyeWorld:camera.getWorldPosition(new T.Vector3()).toArray(),direction:camera.getWorldDirection(new T.Vector3()).toArray(),verticalFov:camera.fov,horizontalFov,near:camera.near,far:camera.far,verticalFovBeforeLastResize:projectionAtResize,referenceAspect:REFERENCE_ASPECT},
  steering:{target:steeringTarget(),amount:steering.amount,lookDegrees:steering.lookDegrees,follow:followSteering,maxLookDegrees:MAX_LOOK_DEGREES,wheelDegrees:steering.amount*MAX_WHEEL_DEGREES,pivot:state.model?.steeringPivot?.name||null,rotationValid:state.model?.steeringRotationValid?.()??false},
  motion:{status:state.motion,phase:state.phase,elapsed:state.elapsed,speedKmh:state.speed*3.6,distance:state.distance,scripted:true},
  render:{drawCalls:renderer?.info.render.calls||0,triangles:renderer?.info.render.triangles||0,frameMs:state.frameMs,frames:state.frames},
  settings:{...settings}
 };
}
function runChecks(show=true){
 if(show)clearSteering(true);draw();const result=snapshot();
 if(show){
  $('qa-overview').textContent=result.ready?(result.invariant.passed?'차량 부품의 크기와 배치를 유지하며 핸들만 정해진 축으로 회전합니다.':'차량 부품의 크기 또는 상대 위치가 바뀐 항목이 있습니다.'):'차량 원본이 없어 실내 비례와 시야 검증은 아직 완료할 수 없습니다. 아래 렌더 수치는 배경 화면 기준입니다.';
  const rows=[
   ['차량 상태',result.ready?'불러오기 완료':'미완료'],
   ['부품 비례·핸들 회전',result.ready?(result.invariant.passed?'유지됨':'변경 감지'):'확인 불가'],
   ['화면 크기',result.viewport.width+' × '+result.viewport.height],
   ['세로 / 가로 시야',result.camera.verticalFov.toFixed(1)+'° / '+result.camera.horizontalFov.toFixed(1)+'°'],
   ['눈 위치 (m)',result.camera.eyeLocal.map(n=>n.toFixed(3)).join(' / ')],
   ['차량 메시 / 삼각형',result.ready?result.model.meshes+' / '+Math.round(result.model.triangles).toLocaleString():'확인 불가'],
   ['화면 드로콜 / 삼각형',result.render.drawCalls+' / '+Math.round(result.render.triangles).toLocaleString()],
   ['프레임 간격',result.render.frames>5?result.render.frameMs.toFixed(1)+' ms':'측정 준비 중'],
   ['조향 / 시선',result.steering.wheelDegrees.toFixed(1)+'° / '+result.steering.lookDegrees.toFixed(1)+'°'],
   ['이동 방식',result.motion.scripted?'가속·제동 스크립트':'—'],
   ['이동 / 속도',result.motion.distance.toFixed(1)+' m / '+result.motion.speedKmh.toFixed(1)+' km/h']
  ];
  $('qa-results').replaceChildren(...rows.map(([term,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;row.append(dt,dd);return row;}));
  if(!$('qa-dialog').open)$('qa-dialog').showModal();
 }
 return result;
}
function toolsVisible(visible){
 if(visible)clearSteering();
 document.body.classList.toggle('ui-hidden',!visible);$('show-tools').hidden=visible;
}
const capturedPointers=new Map();
for(const button of document.querySelectorAll('[data-steer]')){
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||state.asset!=='ready')return;event.preventDefault();
  try{button.setPointerCapture(event.pointerId);}catch{}
  if(!capturedPointers.has(button))capturedPointers.set(button,new Set());capturedPointers.get(button).add(event.pointerId);
  setSteeringInput('pointer:'+event.pointerId,Number(button.dataset.steer));
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{
  setSteeringInput('pointer:'+event.pointerId,0);capturedPointers.get(button)?.delete(event.pointerId);
  if(button.hasPointerCapture?.(event.pointerId))button.releasePointerCapture(event.pointerId);
 });
 button.addEventListener('contextmenu',event=>event.preventDefault());
 button.addEventListener('keydown',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();setSteeringInput('button:'+event.code,Number(button.dataset.steer));}});
 button.addEventListener('keyup',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();setSteeringInput('button:'+event.code,0);}});
 button.addEventListener('blur',()=>{setSteeringInput('button:Space',0);setSteeringInput('button:Enter',0);});
}
const steeringKeys={ArrowLeft:-1,KeyA:-1,ArrowRight:1,KeyD:1};
addEventListener('keydown',event=>{
 if(!steeringKeys[event.code]||event.altKey||event.ctrlKey||event.metaKey||!document.body.classList.contains('ui-hidden')||$('qa-dialog').open||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 event.preventDefault();setSteeringInput('key:'+event.code,steeringKeys[event.code]);
});
addEventListener('keyup',event=>{if(steeringKeys[event.code])setSteeringInput('key:'+event.code,0);});
addEventListener('pointerup',event=>setSteeringInput('pointer:'+event.pointerId,0));
addEventListener('pointercancel',event=>setSteeringInput('pointer:'+event.pointerId,0));
addEventListener('blur',()=>clearSteering(true));
$('steering-follow').onchange=event=>{followSteering=event.target.checked;};
$('try-steering').onclick=()=>toolsVisible(false);
$('hide-tools').onclick=()=>toolsVisible(false);
$('show-tools').onclick=()=>toolsVisible(true);
$('reload-model').onclick=()=>location.reload();
$('run-qa').onclick=()=>runChecks();
$('close-qa').onclick=()=>$('qa-dialog').close();
$('qa-dialog').addEventListener('click',event=>{if(event.target===$('qa-dialog')){const b=$('qa-dialog').getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)$('qa-dialog').close();}});
document.querySelectorAll('[data-glance]').forEach(button=>button.onclick=()=>setPose({glance:button.dataset.glance}));
$('eye-height').oninput=event=>setPose({height:Number(event.target.value)});
$('eye-depth').oninput=event=>setPose({foreAft:Number(event.target.value)});
$('lens-fov').oninput=event=>setPose({verticalFov:Number(event.target.value)});
$('gaze-pitch').oninput=event=>setPose({pitch:Number(event.target.value)});
$('reset-camera').onclick=resetCamera;
$('play-motion').onclick=toggleMotion;$('reset-motion').onclick=resetMotion;
addEventListener('resize',()=>{clearSteering(true);resize();});
addEventListener('keydown',event=>{if(event.code==='Escape'&&!$('qa-dialog').open)toolsVisible(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearSteering(true);if(document.hidden&&state.motion==='playing'){state.motion='paused';state.paused=true;renderReadout();}last=performance.now();});
window.__cockpitStudy={reviewSteering:seconds=>{const count=Math.ceil(clamp(Number(seconds)||0,0,3)*120);for(let i=0;i<count;i++)advanceSteering(1/120);draw();return snapshot();},clearSteering,reviewAt:seconds=>{state.elapsed=clamp(Number(seconds)||0,0,11);state.motion='paused';state.paused=true;applyMotion();renderReadout();draw();return snapshot();},snapshot,runChecks:()=>runChecks(false),setPose,play:()=>{if(state.motion!=='playing')toggleMotion();},pause:()=>{if(state.motion==='playing')toggleMotion();},resetMotion,resetCamera,setToolsVisible:toolsVisible};
updateControls();updateCamera();
if(new URLSearchParams(location.search).get('view')==='clean')toolsVisible(false);
try{
 renderer=new T.WebGLRenderer({canvas:$('study-world'),antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 resize();loadCar();
 function frame(now){
  const dt=clamp((now-last)/1000,0,.05);last=now;
  if(!document.hidden){state.frameMs=state.frameMs*.97+dt*1000*.03;state.frames++;}
  if(state.motion==='playing'){
   state.elapsed=Math.min(11,state.elapsed+dt);applyMotion();
   if(state.elapsed>=11){state.motion='finished';state.speed=0;renderReadout();}
  }
  if(!document.hidden)advanceSteering(dt);
  draw();
  if(now-lastReadout>120){renderReadout();lastReadout=now;}
  if(!document.hidden&&state.frameMs>35)state.slowFrames++;else state.slowFrames=Math.max(0,state.slowFrames-1);
  if(state.slowFrames>150&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);state.slowFrames=0;}
  raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 $('study-world').addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(raf);clearSteering(true);$('steering-controls').disabled=true;state.motion='paused';setStatus('error','화면 연결 중단');setNotice('3D 화면 연결이 끊겼어요','다시 불러오면 시안을 처음부터 확인할 수 있습니다.',true);renderReadout();});
}catch(error){failAsset(error);setNotice('이 브라우저에서 3D 화면을 열 수 없어요','WebGL을 사용할 수 있는 브라우저에서 다시 열어 주세요.',true);}
