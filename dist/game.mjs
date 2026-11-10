import {prepareRaceVisual,createMirrorSchedule} from './race-rendering.mjs?v=traffic-1';
import {createStudyStore,freshStudySave,ART_STUDY_KEY} from './garage-flow-study.mjs?v=marina-city-1';
import {installGarageFlow,itemMarkup} from './garage-flow.mjs?v=marina-city-1';
import {wheelThumbnails} from './garage-wheel-thumbnails.mjs?v=garage-flow-1';
import {loadCourseRuntime} from './course-runtime.mjs?v=marina-city-1';
import {createRaceSettlement} from './race-settlement.mjs?v=circuit-main-1';
import {createDrivingSound} from './driving-sound.mjs?v=circuit-main-1';
import {createFrameMeasure} from './studies/circuit-elevation/performance.mjs';
import {installRaceTouchGuard} from './race-touch-guard.mjs?v=race-safety-1';
import {recoveryVisual} from './course-recovery.mjs?v=race-safety-1';
import {installDriveConsole} from './drive-console.mjs?v=graphite-1';
import {createCircuitMap,drivingReadout,nearbyCar} from './race-hud.mjs?v=race-hud-1';
import {setCabinUp} from './cockpit-attitude.mjs?v=cabin-layout-1';
import {createCityCourse,COURSE_ID,COURSE_NAME,SECTORS,COURSE_META} from './selected-course.mjs?v=marina-city-1';
import {resetRetiredRecords} from './race-course-ids.mjs?v=marina-city-1';
import {installRaceCourses} from './race-course-ui.mjs?v=marina-city-1';
import {createImpactSound} from './collision-feel.mjs?v=city-tour-1';
import {installCitySteering} from './city-steering.mjs?v=graphite-1';
import {installSaveTransfer} from './save-transfer-ui.mjs?v=marina-city-1';
import {SAVE_KEY,readSnapshot} from './save-transfer.mjs?v=marina-city-1';
import {createCockpit} from './cockpit-visual.mjs?v=gallardo-cockpit-1';
import {createRearView} from './rear-view.mjs?v=traffic-1';
import {createOriginalCockpit} from './studies/mixed-city/cockpit.mjs?v=marina-city-1';
import {createSteeringState,stepSteering,MAX_LOOK_DEGREES} from './cockpit-study-steering.mjs?v=steering-look-1';
import {splitWheelVisuals,syncWheelVisuals} from './wheel-visual.mjs?v=wheels-1';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {CAR_NAMES,presentItem} from './vehicle-presentation.mjs?v=porsche-main-1';
import {clamp,mod,trackFrame,nearestTrack,makeRacer,rankOf,finishRacer} from './race-core.mjs?v=city-tour-1';
import {FIXED_DT} from './studies/mixed-city/physics.mjs?v=marina-city-1';
import {createPreviewSession} from './garage-preview-core.mjs?v=marina-city-1';
import {bindDragRotation} from './studies/garage-preview/drag-rotation.mjs?v=garage-preview-2';
import {CATALOG,CATEGORIES,normalizeSave,tuning,itemById} from './garage-core.mjs?v=marina-city-1';
import {loadVehicles,dressCar,disposeDress,buildGarage,steerExterior,opponentCars,vehicleAppearance} from './main-vehicles.mjs?v=marina-city-1';
import {installPageActivity} from './studies/mixed-city/activity.mjs?v=mixed-city-3';

const $=id=>document.getElementById(id),canvas=$('world');
const SAVE=SAVE_KEY;
const studyName=new URLSearchParams(location.search).get('study');
const artStudy=studyName==='garage-art',garageStudy=artStudy||studyName==='garage-flow';
const daylight=artStudy&&new URLSearchParams(location.search).get('look')!=='before';
let studyStore=null;if(garageStudy){document.querySelectorAll('[data-save-transfer-open]').forEach(b=>b.hidden=true);let storage;try{storage=sessionStorage;}catch{}studyStore=createStudyStore(storage,artStudy?ART_STUDY_KEY:undefined);}
let save=normalizeSave(null),storageOK=true,saveWriteBlocked=false;
if(garageStudy)save=studyStore.read();else try{const current=readSnapshot(localStorage);if(current.invalid){storageOK=false;saveWriteBlocked=true;}else {save=resetRetiredRecords(current.save);}}catch{storageOK=false;saveWriteBlocked=true;}
function persist(){if(garageStudy){studyStore.write(save);return;}if(saveWriteBlocked)return;try{localStorage.setItem(SAVE,JSON.stringify(save));}catch{storageOK=false;}}
if(!saveWriteBlocked)persist();
// The transfer tools work before the 3D assets finish loading.
let refreshTransferredSave=null;
if(!garageStudy)installSaveTransfer({getSave:()=>save,onSaveChanged:next=>{save=resetRetiredRecords(next);storageOK=true;saveWriteBlocked=false;persist();refreshTransferredSave?.();}});
function fail(message){$('fatal-message').textContent=message;$('fatal').hidden=false;}
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{fail('Safari 또는 Chrome 최신 버전에서 다시 열어 주세요.');}
if(renderer)boot().catch(e=>{console.error(e);fail('차량이나 코스를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 열어 주세요.');});

async function boot(){
 const trafficOptimized=new URLSearchParams(location.search).get('traffic')!=='original',mirrorSchedule=createMirrorSchedule();
 const reducedRecoveryMotion=matchMedia('(prefers-reduced-motion: reduce)');
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new T.Scene();scene.background=new T.Color('#101e34');scene.fog=new T.FogExp2('#1b2e47',.003);
 const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.12,700);
 const fleet=await loadVehicles();scene.environment=fleet.assets.environment;
 scene.environmentIntensity=1;


 const unit=new T.BoxGeometry(1,1,1);
 const track=createCityCourse(),{length}=track;
 const courseRuntime=await loadCourseRuntime(COURSE_META);
 const courseScene=await courseRuntime.buildScene(scene,track,{renderer,sectors:SECTORS,look:daylight?'daylight':'before'});
 const groundHeight=courseScene.groundHeight;
 const garageScene=new T.Scene();garageScene.background=new T.Color('#101e34');garageScene.fog=new T.FogExp2('#1b2e47',.003);garageScene.environment=fleet.assets.environment;garageScene.environmentIntensity=1;
 const gltf=new GLTFLoader(),models={};let loaded=0;
 const originalCockpitPromise=createOriginalCockpit({scene,camera,loader:gltf});
 const items=['tavaculo','f2002','porsche'];
 function normalize(ob,target){ob.updateMatrixWorld(true);let b=new T.Box3().setFromObject(ob);const size=b.getSize(new T.Vector3());if(target){ob.scale.multiplyScalar(target/Math.max(size.x,size.z));ob.updateMatrixWorld(true);b=new T.Box3().setFromObject(ob);}const center=b.getCenter(new T.Vector3());const group=new T.Group();group.add(ob);ob.position.x-=center.x;ob.position.z-=center.z;ob.position.y-=b.min.y;return group;}
 const rigs=await fetch('./assets/vehicle-rigs.json').then(r=>{if(!r.ok)throw Error('Missing wheel rig');return r.json();});
 await Promise.all(items.map(async name=>{
  if(name==='tavaculo'){models[name]=fleet.exterior;rigs[name]=fleet.rig;}
  else if(name==='porsche'){models[name]=fleet.porsche.exterior;rigs[name]=fleet.porsche.rig;}
  else{const vehicle=name==='f2002';const asset=await gltf.loadAsync('./assets/'+name+(vehicle?'-rigged':'')+'.glb');models[name]=normalize(asset.scene,vehicle?5.2:null);}
  loaded++;$('load-status').textContent='차량과 코스 준비 '+Math.round(loaded/items.length*100)+'%';
 }));
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sx=shadowCanvas.getContext('2d'),grad=sx.createRadialGradient(32,32,6,32,32,32);grad.addColorStop(0,'#000b');grad.addColorStop(1,'#0000');sx.fillStyle=grad;sx.fillRect(0,0,64,64);const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
 const shadowGeometry=new T.PlaneGeometry(3.6,6.0);
 let wheelInspection=false;
 let selected=save.car,view=save.view==='cockpit'?'cockpit':'chase',mode='menu',count=0,elapsed=0,awarded=false,player,racers=[],visuals=[],toastTime=0,pausedFrom='race',physics=null;
 if(new URLSearchParams(location.search).get('view')==='cockpit')view='cockpit';
 const impactSound=createImpactSound(),drivingSound=createDrivingSound();
 let settlement=createRaceSettlement(COURSE_ID),lastRace=null;
 const driveMeasure=createFrameMeasure();
 for(const kind of ['pointerdown','keydown'])addEventListener(kind,()=>{impactSound.unlock();drivingSound.unlock();},{passive:true});
 for(const id of ['impact-audio','pause-impact-audio'])$(id).onchange=e=>{impactSound.enabled=e.target.checked;drivingSound.enabled=e.target.checked;if(e.target.checked)drivingSound.unlock();for(const name of ['impact-audio','pause-impact-audio'])$(name).checked=e.target.checked;};
 let steeringControl=null,pedalConsole=null,recentImpact=null;
 const input={left:false,right:false,throttle:false,brake:false,reverse:false,drift:false};const held=new Map(),pointerZones=new Map(),keys=new Set();
 let flowUI=null;const wheelImages={};
 const garage=daylight?await (await import('./garage-daylight.mjs?v=garage-art-1')).buildDaylightGarage(garageScene,renderer):buildGarage(garageScene);if(!daylight)garage.traverse(o=>{if(o.isLight)o.intensity=0;});let preview,previewAngle=0,category='paint',atWelcome=true;const shopPreview=createPreviewSession({categories:Object.keys(CATEGORIES)});let garageDrag={cancel(){}};
 function refreshPreview(){garageDrag.cancel();if(preview){garageScene.remove(preview);disposeDress(preview);}preview=dressCar(models[selected].clone(true),selected,shopPreview.loadout(save,selected),rigs[selected]);preview.position.set(0,.24,-110);preview.rotation.y=previewAngle;garageScene.add(preview);if(daylight){preview.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});const contact=new T.Mesh(shadowGeometry,shadowMat);contact.rotation.x=-Math.PI/2;contact.position.y=.006;contact.scale.set(.72,.72,1);preview.add(contact);renderer.shadowMap.needsUpdate=true;}}
 refreshPreview();
 const cabins=await originalCockpitPromise;let originalCockpit=cabins[selected]||cabins.tavaculo;
 function selectCabin(){for(const [kind,cabin] of Object.entries(cabins))if(kind!==selected)cabin.group.visible=false;originalCockpit=cabins[selected]||cabins.tavaculo;}
 for(const button of document.querySelectorAll('[data-city-look]')){
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);originalCockpit.setLook(Number(button.dataset.cityLook));};
  const release=()=>originalCockpit.setLook(null);button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
  button.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();originalCockpit.setLook(Number(button.dataset.cityLook));}};button.onkeyup=release;button.onblur=release;
 }
 addEventListener('blur',()=>originalCockpit.setLook(null));
 const gazeState=createSteeringState();let gazeFollow=true,gazeTarget=0,bodyMotion=true;
 function resetGaze(){gazeState.amount=0;gazeState.lookDegrees=0;gazeTarget=0;originalCockpit.reset();}
 const cockpitVisual=createCockpit(camera),cockpit=cockpitVisual.group;scene.add(camera);
 const mirrors=Object.fromEntries(Object.entries(cabins).map(([kind,cabin])=>[kind,{
  rear:createRearView({renderer,scene,camera,cockpit:cabin.group,surface:cabin.mirrorSurface}),
  sides:cabin.sideMirrors.map(m=>({id:m.id,view:createRearView({renderer,scene,camera,cockpit:cabin.group,surface:m.surface,options:{name:kind+'-'+m.id,origin:m.origin,aspect:m.aspect,yaw:m.yaw,width:192,height:96,hz:10,economyWidth:128,economyHeight:64,economyHz:6,fov:36,allowOverlay:false,cullOffscreen:true}})}))
 }]));let rearView=mirrors.tavaculo.rear,sideViews=mirrors.tavaculo.sides;
 function renderMirror(force=false,now=performance.now()){
  rearView=(mirrors[selected]||mirrors.tavaculo).rear;sideViews=(mirrors[selected]||mirrors.tavaculo).sides;
  for(const [kind,m] of Object.entries(mirrors)){const args={player,enabled:kind===selected&&originalCockpit.group.visible&&mode!=='menu'&&!wheelInspection,paused:mode==='paused'||mode==='result',force,now,frameMs:avgFrame,portrait:innerHeight>innerWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,hide:[visuals[0]?.root,cockpit,...Object.values(cabins).map(c=>c.group)]};mirrorSchedule.run([m.rear,...m.sides.map(s=>s.view)],args,{force,optimized:trafficOptimized});}
 }

 function paintRecovery(){
  const state=physics?.recoveryStats(),playing=['race','countdown'].includes(mode),fx=recoveryVisual(playing?(state?.remaining||0):0,reducedRecoveryMotion.matches);
  $('recovery-effect').hidden=!fx.active;$('recovery-effect').style.setProperty('--recovery-opacity',String(fx.pulse));
  if(visuals[0])visuals[0].root.visible=fx.carVisible;
  // Blink the complete cabin together; the road, HUD and controls stay readable.
  const cabinVisible=mode!=='menu'&&!wheelInspection&&view==='cockpit'&&fx.carVisible;
  originalCockpit.group.visible=cabinVisible&&selected!=='f2002';cockpit.visible=cabinVisible&&selected==='f2002';
 }
 function renderScene(forceMirror=false,now=performance.now()){if(daylight&&camera.far!==2400){camera.far=2400;camera.updateProjectionMatrix();}paintRecovery();if(mode!=='menu')renderMirror(forceMirror,now);if(mode==='menu')camera.updateMatrixWorld(true);renderer.render(mode==='menu'?garageScene:scene,camera);}
 const cameraTarget=new T.Vector3(),lookTarget=new T.Vector3(),desired=new T.Vector3();
 function syncGarageView(){
  const draft=shopPreview.loadout(save,selected),pending=shopPreview.pending;
  $('preview-name').textContent=CAR_NAMES[selected];$('preview-style').textContent=itemById(draft.paint).name+' · '+presentItem(itemById(draft.wheels),selected).name;
  $('garage-preview-badge').textContent=pending?(flowUI?.modern?'미리보기':'미리보기 중 · 아직 확정 전'):'장착된 모습';
  const performance=pending&&!['paint','wheels'].includes(itemById(pending.id).category);
  $('tuning-label').textContent=performance?'적용할 성능 · 확정 전':'장착한 성능';
  const t=tuning({...save,garage:{...save.garage,[selected]:draft}},selected);
  $('tuning-stats').innerHTML=[['엔진 힘',t.force],['최고속도',t.maxSpeed],['접지',t.grip],['제동',t.brake]].map(([name,value])=>'<span>'+name+' '+(value>1?'+'+Math.round((value-1)*100)+'%':'기본')+'</span>').join('');
  $('garage-preview-state').textContent=JSON.stringify({pending,rotation:previewAngle,displayLoadout:draft,...vehicleAppearance(preview)});
 }
 function cancelShop(message){
  message??=flowUI?.modern?'미리보기 취소':'미리보기를 취소했어요. 잔액과 장착은 그대로예요.';
  shopPreview.cancel();garageDrag.cancel();refreshPreview();renderShop();$('shop-status').textContent=message;
 }
 function renderShop(){
  if(flowUI?.modern&&category==='wheels'&&!wheelImages[selected])wheelImages[selected]=wheelThumbnails({items:CATALOG.filter(i=>i.category==='wheels'),makeModel:item=>dressCar(models[selected].clone(true),selected,{...save.garage[selected],wheels:item.id},rigs[selected]),rig:rigs[selected],environment:garageScene.environment,disposeModel:disposeDress});
  const pending=shopPreview.pending,quote=shopPreview.quote(save);$('shop-items').dataset.category=category;$('shop-offer').dataset.performance=String(!['paint','wheels'].includes(category));
  $('shop-tabs').innerHTML=Object.entries(CATEGORIES).filter(([key])=>!flowUI?.modern||flowUI.categories().includes(key)).map(([key,name])=>'<button data-category="'+key+'" class="'+(key===category?'selected':'')+'" aria-pressed="'+(key===category)+'">'+name+'</button>').join('');
  $('shop-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(category===b.dataset.category)return;category=b.dataset.category;if(flowUI?.modern){previewAngle=category==='wheels'?Math.PI/2:0;}cancelShop(flowUI?.modern?'':'분류를 바꾸어 장착된 모습을 보여줘요.');document.querySelector('.garage-scroll').scrollTop=0;});
  $('shop-items').innerHTML=CATALOG.filter(i=>i.category===category).map(source=>{
   const item=presentItem(source,selected),owned=save.owned.includes(item.id),equipped=save.garage[selected][category]===item.id,active=pending?.id===item.id;
   if(flowUI?.modern)return itemMarkup({item,owned,equipped,active,pending:!!pending,stockColor:selected==='porsche'?'#d9dde0':'#e92b27',thumbnail:wheelImages[selected]?.[item.id]});
   return '<button class="shop-item '+(equipped?'equipped ':'')+(active?'previewing':'')+'" data-item="'+item.id+'" aria-pressed="'+active+'" '+(equipped&&!pending?'disabled':'')+'><span class="item-title"><span class="swatch '+(category==='wheels'?'wheel-swatch':'')+'" style="--swatch:'+(item.color||(category==='paint'?'#ff0000':'#c9d0d2'))+'"></span><strong>'+item.name+'</strong></span><small>'+item.description+'</small><span class="item-price">'+(equipped?'현재 장착':owned?'보유 중 · 무료 장착':item.price.toLocaleString()+' C')+'</span><em>'+(active?'미리보기 중':equipped?'장착된 모습 보기':['paint','wheels'].includes(category)?'차에 미리 보기':'효과와 가격 확인')+'</em></button>';
  }).join('');
  $('shop-items').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{shopPreview.begin(save,selected,b.dataset.item);if(flowUI?.modern)$('shop-status').textContent='';refreshPreview();renderShop();if(shopPreview.pending&&!flowUI?.modern)$('shop-cancel').focus({preventScroll:true});});
  $('shop-offer').hidden=!quote;$('start').hidden=!!quote;$('launch-actions').hidden=!!quote;$('race-brief').hidden=!!quote;
  if(quote){const item=presentItem(quote.item,selected);$('shop-offer-name').textContent=item.name;$('shop-offer-cost').textContent=quote.owned?'보유품 · 무료':quote.cost.toLocaleString()+' C';$('shop-offer-description').textContent=['paint','wheels'].includes(category)?'확정하면 이 모습으로 장착해요.':item.description;$('shop-offer-balance').textContent=quote.affordable?'잔액 '+quote.balance.toLocaleString()+' → '+quote.after.toLocaleString()+' C':(quote.cost-quote.balance).toLocaleString()+(flowUI?.modern?' C 부족':' C 부족 · 미리보기는 가능해요');$('shop-confirm').disabled=!quote.affordable;$('shop-confirm').textContent=quote.owned?'장착 확정':quote.affordable?'구매하고 장착':'잔액 부족';}
  syncGarageView();flowUI?.sync();
 }
 function syncOptions(){document.querySelectorAll('[data-car]').forEach(b=>{const on=b.dataset.car===selected;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('view-select').value=view;$('assist').checked=!!save.assist;$('auto-throttle').checked=!!save.auto;$('wallet').textContent=save.coins.toLocaleString()+' C';const best=save.courseBest?.[COURSE_ID]?.[selected];$('best').textContent=(Number.isFinite(best)?COURSE_NAME+' 최고 '+formatTime(best):COURSE_NAME+' 첫 기록에 도전해요');
  $('preview-name').textContent=CAR_NAMES[selected];$('preview-style').textContent=itemById(save.garage[selected].paint).name+' · '+presentItem(itemById(save.garage[selected].wheels),selected).name;
  const t=tuning(save,selected);$('tuning-stats').innerHTML=[['엔진 힘',t.force],['최고속도',t.maxSpeed],['접지',t.grip],['제동',t.brake]].map(([name,value])=>`<span>${name} ${value>1?'+'+Math.round((value-1)*100)+'%':'기본'}</span>`).join('');
  $('garage-story').textContent=storageOK?(save.races?'지금까지 '+save.races+'번 완주! 우리 차를 꾸미고 다음 경주에 도전해요.':'첫 번째 완주가 꿈의 시작! 경주에서 상금을 모아 봐요.'):'저장이 제한된 브라우저예요. 이 창을 닫으면 상금과 꾸미기가 사라질 수 있어요.';renderShop();
 }
 function updateCamera(snap=false){
  selectCabin();camera.near=.12;originalCockpit.group.visible=false;
  if(mode==='menu'){
   cockpit.visible=false;garage.visible=true;camera.up.set(0,1,0);const portrait=innerWidth<=700&&innerHeight>innerWidth;garage.userData.sign.visible=!portrait;camera.position.set(6.1,2.6,-118.1);camera.lookAt(0,.95,-110);camera.fov=portrait?56:45;const panelWidth=$('menu').hidden?0:$('menu').querySelector('.garage-panel').getBoundingClientRect().width;camera.setViewOffset(innerWidth,innerHeight,portrait?0:atWelcome?-innerWidth*.22:panelWidth*.5+18,portrait?innerHeight*.30:0,innerWidth,innerHeight);if(!atWelcome){const r=document.querySelector('.garage-stage').getBoundingClientRect();const tall=innerHeight>innerWidth;camera.fov=tall?T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(28))*innerHeight/874*402/innerWidth)):45;camera.setViewOffset(innerWidth,innerHeight,innerWidth/2-(r.x+r.width/2),innerHeight/2-(r.y+r.height*.55),innerWidth,innerHeight);garage.userData.sign.visible=false;if(flowUI?.modern){if(!tall)camera.fov=32;if(selected==='f2002')camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*1.2));}}camera.updateProjectionMatrix();return;
  }
  garage.visible=false;camera.clearViewOffset();
  const direction=new T.Vector3(Math.sin(player.heading),0,Math.cos(player.heading));
  if(wheelInspection){cockpit.visible=false;visuals[0].body.visible=true;visuals[0].wheels.forEach(w=>w.visible=true);visuals[0].calipers.forEach(w=>w.visible=true);const right=new T.Vector3(direction.z,0,-direction.x);camera.up.set(0,1,0);camera.position.set(player.x,(player.y||0)+1.55,player.z).addScaledVector(direction,2.4).addScaledVector(right,3.7);const target=new T.Vector3(player.x,(player.y||0)+.48,player.z).addScaledVector(direction,.45);camera.lookAt(target);camera.fov=46;camera.updateProjectionMatrix();return;}

  cockpit.visible=view==='cockpit'&&selected==='f2002';originalCockpit.group.visible=view==='cockpit'&&selected!=='f2002';document.body.dataset.view=view;document.body.dataset.car=selected;
  originalCockpit.mirrorMount.visible=innerWidth>=innerHeight;
  originalCockpit.update({player,steeringAmount:clamp(-player.steeringAngle/.46,-1,1),lookDegrees:gazeState.lookDegrees,now:performance.now(),paint:itemById(save.garage[selected].paint).color});
  cockpitVisual.update({car:selected,speed:player.speed,forwardSpeed:player.forwardSpeed,driveMode:player.driveMode,steeringAngle:player.steeringAngle,aspect:camera.aspect,paint:itemById(save.garage[selected].paint).color});
  visuals[0].body.visible=view!=='cockpit';
  visuals[0].wheels.forEach(w=>w.visible=view!=='cockpit');visuals[0].calipers.forEach(w=>w.visible=view!=='cockpit');
  if(view==='cockpit'&&selected!=='f2002'){
   originalCockpit.applyCamera();
  }else if(view==='cockpit'){
   const isFormula=selected==='f2002';
   camera.fov=isFormula?75:60;camera.position.set(player.x,(player.y||0)+(isFormula?1.03:.88),player.z);camera.position.addScaledVector(direction,isFormula?-.28:-.20);
   // The model faces +Z: +X is the driver's left, not the screen's right.
   // A lower left seat sees the road from that seat while looking along the car.
   if(!isFormula)camera.position.addScaledVector(new T.Vector3(direction.z,0,-direction.x),.38);
   const bodyForward=new T.Vector3(0,0,1).applyQuaternion(new T.Quaternion().fromArray(player.quaternion||[0,0,0,1]));
   setCabinUp(camera.up,new T.Quaternion().fromArray(player.quaternion||[0,0,0,1]),new T.Vector3(0,1,0));
   if(isFormula)camera.lookAt(player.x+direction.x*40,camera.position.y+bodyForward.y*10+.15,player.z+direction.z*40);
   else camera.lookAt(camera.position.x+direction.x*40,camera.position.y+bodyForward.y*10-.28,camera.position.z+direction.z*40);
  }else{
   camera.up.set(0,1,0);camera.fov=62+Math.min(player.speed/38*7,7);desired.set(player.x-direction.x*(6.5+player.speed*.018),2.9+(player.y||0),player.z-direction.z*(6.5+player.speed*.018));
   camera.position.lerp(desired,snap?1:1-Math.exp(-lastDt*6));cameraTarget.set(player.x+direction.x*6,(player.y||0)+.85,player.z+direction.z*6);lookTarget.lerp(cameraTarget,snap?1:1-Math.exp(-lastDt*9));camera.lookAt(lookTarget);
  }
  camera.updateProjectionMatrix();$('camera').textContent=view==='chase'?'운전석':'차 뒤';$('camera').setAttribute('aria-label',view==='chase'?'운전석 시점으로 전환':'차 뒤 시점으로 전환');
 }
 const skidMesh=new T.InstancedMesh(unit,new T.MeshBasicMaterial({color:'#10202b',transparent:true,opacity:.52,depthWrite:false}),180);skidMesh.count=0;skidMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);skidMesh.frustumCulled=false;scene.add(skidMesh);let skidIndex=0,skidTime=0,previousSkids=null;const skidObject=new T.Object3D();
 function resetSkids(){skidMesh.count=0;skidIndex=0;skidTime=0;previousSkids=null;}
 function updateSkids(dt){if(!player?.drifting){previousSkids=null;return;}skidTime+=dt;if(skidTime<.06)return;skidTime=0;const rear=player.wheels.slice(2).map(w=>({x:w.position[0],z:w.position[2]}));if(previousSkids)rear.forEach((p,i)=>{const old=previousSkids[i],dx=p.x-old.x,dz=p.z-old.z,len=Math.hypot(dx,dz);if(len<.02||len>6)return;skidObject.position.set((p.x+old.x)/2,groundHeight((p.x+old.x)/2,(p.z+old.z)/2)+.075,(p.z+old.z)/2);skidObject.rotation.set(0,Math.atan2(dx,dz),0);skidObject.scale.set(.18,.009,len+.03);skidObject.updateMatrix();skidMesh.setMatrixAt(skidIndex,skidObject.matrix);skidIndex=(skidIndex+1)%180;skidMesh.count=Math.min(180,skidMesh.count+1);});previousSkids=rear;skidMesh.instanceMatrix.needsUpdate=true;}
 function clearInput(){steeringControl?.clear();pedalConsole?.clear();resetGaze();held.clear();pointerZones.clear();keys.clear();Object.keys(input).forEach(k=>input[k]=false);document.querySelectorAll('[data-control]').forEach(b=>{b.classList.remove('pressed');b.setAttribute('aria-pressed','false');});pedalConsole?.paint(input);}
 function readInput(){for(const k of Object.keys(input))input[k]=[...held.values()].includes(k);input.left ||= keys.has('ArrowLeft')||keys.has('KeyA');input.right ||=keys.has('ArrowRight')||keys.has('KeyD');input.throttle ||=keys.has('ArrowUp')||keys.has('KeyW');input.brake ||=keys.has('ArrowDown')||keys.has('KeyS')||keys.has('Space');input.reverse ||=keys.has('KeyX');input.drift ||=keys.has('ShiftLeft')||keys.has('ShiftRight');pedalConsole?.paint(input);}
 function showToast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastTime=2.5;}
 let mapOpen=false;
 function resetRace(){lastRace=null;shopPreview.cancel();garageDrag.cancel();renderShop();
  mapOpen=false;$('course-map').hidden=true;
  physics?.dispose();resetSkids();
  visuals.forEach(v=>{scene.remove(v.root);v.rendering?.dispose();disposeDress(v.body);});visuals=[];if(preview)preview.visible=false;
  player=makeRacer(track,{car:selected,lane:-2.3});racers=[player,...opponentCars(selected).map((car,i)=>makeRacer(track,{id:'bot'+i,car,s:7+i*7,lane:i%2?-2.3:2.3}))];
  for(const r of racers){const root=new T.Group(),body=models[r.car].clone(true);if(r===player||r.car==='porsche')dressCar(body,r.car,r===player?save.garage[selected]:{paint:'paint-stock',wheels:'wheels-stock'},rigs[r.car]);root.add(body);const {wheels,calipers}=splitWheelVisuals(body,rigs[r.car]);wheels.forEach(w=>root.add(w));calipers.forEach(c=>root.add(c));const shadow=new T.Mesh(shadowGeometry,shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.06;root.add(shadow);const rendering=prepareRaceVisual({body,wheels,calipers,opponent:r!==player});rendering.setOptimized(trafficOptimized);scene.add(root);visuals.push({root,body,wheels,calipers,shadow,rendering});}
  physics=courseRuntime.createPhysics(track,racers,rigs,{autoRecovery:true,playerTuning:tuning(save,selected)});physics.presentationEnabled=bodyMotion;
  elapsed=0;awarded=false;settlement=createRaceSettlement(COURSE_ID);drivingSound.stop();if(COURSE_META.key==='circuit')renderer.shadowMap.needsUpdate=true;count=3.3;clearInput();mode='countdown';$('welcome').hidden=true;$('menu').hidden=$('pause-menu').hidden=$('result').hidden=true;$('hud').hidden=false;$('countdown').hidden=false;syncVisuals();updateCamera(true);persist();
 }
 function syncVisuals(){racers.forEach((r,i)=>{const v=visuals[i];v.body.position.set(r.x,r.y??.045,r.z);v.body.quaternion.fromArray(r.quaternion||[0,0,0,1]);steerExterior(v.body,r.car,clamp(-(r.steeringAngle||0)/.46,-1,1),fleet.porsche.template.axis);v.shadow.position.set(r.x,groundHeight(r.x,r.z)+.062,r.z);v.shadow.rotation.z=-r.heading;syncWheelVisuals(v.wheels,v.calipers,r.wheels);});}
 function toMenu(){flowUI?.home();shopPreview.cancel();garageDrag.cancel();mapOpen=false;$('course-map').hidden=true;clearInput();mode='menu';drivingSound.stop();physics?.dispose();physics=null;$('hud').hidden=$('result').hidden=$('pause-menu').hidden=$('countdown').hidden=true;$('welcome').hidden=true;$('menu').hidden=false;atWelcome=false;visuals.forEach(v=>{scene.remove(v.root);v.rendering?.dispose();disposeDress(v.body);});visuals=[];refreshPreview();preview.visible=true;syncOptions();if(lastRace){$('shop-status').textContent=COURSE_NAME+'에서 '+lastRace.prize.toLocaleString()+' C를 받았어요. 미리 본 뒤 확정하면 다음 경주에 적용돼요.';}updateCamera(true);}
 function setPause(){if(!['race','countdown'].includes(mode))return;pausedFrom=mode;mode='paused';drivingSound.stop();clearInput();updateCamera(true);$('pause-menu').hidden=false;$('pause-menu').querySelector('.compact').scrollTop=0;$('countdown').hidden=true;}
 function resume(){mapOpen=false;$('course-map').hidden=true;mode=pausedFrom;$('pause-menu').hidden=true;$('countdown').hidden=mode!=='countdown';last=performance.now();}
 function switchView(){resetGaze();view=view==='chase'?'cockpit':'chase';save.view=view;persist();updateCamera(true);}
 function finish(){
  const result=settlement.finish(save,player,racers,elapsed);if(!result)return;
  awarded=true;mode='result';drivingSound.stop();clearInput();persist();lastRace={...result,car:selected};
  const {rank,prize,record,previousBest}=result;
  $('result-title').textContent=rank===1?'우승했어요!':'멋지게 완주했어요!';$('result-rank').textContent=rank+'위';$('result-course-name').textContent=COURSE_NAME+' · 한 바퀴';$('result-time').textContent='완주 기록 '+formatTime(elapsed);
  $('prize').textContent='+'+prize.toLocaleString()+' C';$('total-prize').textContent='모은 상금 '+save.coins.toLocaleString()+' C';
  $('record-note').textContent=storageOK?(Number.isFinite(previousBest)?record?'이 차의 최고 기록보다 '+(previousBest-elapsed).toFixed(2)+'초 빨랐어요.':'이 차의 최고 기록까지 '+Math.max(0,elapsed-previousBest).toFixed(2)+'초 남았어요.':'이 코스에서 이 차의 첫 기록을 남겼어요.'):'이 브라우저에서는 기록을 저장할 수 없어요.';
  $('result-story').textContent='상금으로 차를 꾸미거나, 같은 차로 기록에 다시 도전해 보세요.';$('result').hidden=false;$('result').querySelector('.compact').scrollTop=0;
 }
 function step(dt,forcedInput=null){
  if(mode==='countdown'){count-=dt;$('countdown').textContent=count>.3?Math.ceil(count-.3):'GO!';if(count<=0){mode='race';$('countdown').hidden=true;}return;}
  if(mode!=='race')return;
  readInput();const drive=forcedInput||{...input,...(steeringControl?.mode==='slide'&&!input.left&&!input.right?{steer:steeringControl.value}:{}),throttle:input.throttle||(save.auto&&!input.reverse&&!input.brake&&(player.forwardSpeed||0)>-.2)};const wasBlocked=player.reverseBlocked;const result=physics.step(dt,drive,save.assist);if(result.recoveries.length){clearInput();resetSkids();toastTime=0;$('toast').classList.remove('visible');syncVisuals();updateCamera(true);}if(player.reverseBlocked&&!wasBlocked)showToast('멈춘 뒤 후진을 떼었다 다시 눌러요');updateSkids(result.steps*FIXED_DT);elapsed+=result.steps*FIXED_DT;
  gazeTarget=selected!=='f2002'&&view==='cockpit'&&((!!drive.left!==!!drive.right)||(steeringControl?.active&&Number.isFinite(drive.steer)&&Math.abs(drive.steer)>.001))?clamp(-player.steeringAngle/.46,-1,1):0;
  stepSteering(gazeState,gazeTarget,result.steps*FIXED_DT,gazeFollow);
  for(const hit of result.hits)if(hit.id===player.id){recentImpact={...hit};impactSound.play(hit);if(hit.level!=='light')showToast(hit.level==='heavy'?'큰 충돌 · 속도를 줄이고 자세를 잡아요':hit.kind==='car'?'접촉 · 방향을 다시 맞춰요':'벽에 닿았어요 · 속도를 줄여요');}
  racers.slice(1).forEach(r=>finishRacer(r,track,elapsed));
  if(finishRacer(player,track,elapsed))finish();
 }
 const compactMap=createCircuitMap($('map'),track),fullMap=createCircuitMap($('full-map'),track);
 function openMap(){
  if(!['race','countdown'].includes(mode))return;
  setPause();mapOpen=true;$('pause-menu').hidden=true;$('course-map').hidden=false;
  $('course-map').querySelector('.course-panel').scrollTop=0;fullMap.draw(player,racers);$('map-resume').focus({preventScroll:true});
 }
 function updateHUD(){
  if(!player)return;
  const readout=drivingReadout(player);$('speed').textContent=readout.kmh;$('gear').textContent=readout.gear;
  $('gear-mode').textContent=readout.mode;$('rpm-fill').style.width=readout.ratio*100+'%';
  const state=player.missedRoute?'지나친 구간이 있어요 · 도로로 복귀를 눌러 이어가세요':player.reverseBlocked?'멈춘 뒤 후진을 다시 눌러요':player.drifting?'드리프트 · 가속 유지':readout.gear==='R'?'후진 · R':player.braking?'브레이크':physics?.advice(player)||'';
  $('drive-state').textContent=state;$('drive-state').classList.toggle('drifting',!!player.drifting);
  $('rank').innerHTML=rankOf(player,racers)+'<span>/ 4</span>';
  $('progress').innerHTML=Math.floor(clamp(player.distance/length*100,0,100))+'<span>%</span>';
  $('time').textContent=formatTime(elapsed);compactMap.draw(player,racers);if(mapOpen)fullMap.draw(player,racers);
  $('race-progress').style.width=clamp(player.distance/length*100,0,100)+'%';
  const near=nearbyCar(player,racers),indicator=$('near-car');indicator.hidden=!near;
  if(near){indicator.dataset.side=near.side;indicator.textContent=near.side==='left'?'◀ 옆 차':'옆 차 ▶';}
 }
 $('map-open').onclick=openMap;$('map-resume').onclick=()=>{resume();$('map-open').focus({preventScroll:true});};
 function syncGazeOptions(){for(const id of ['gaze-follow','pause-gaze-follow'])$(id).checked=gazeFollow;}
 for(const id of ['gaze-follow','pause-gaze-follow'])$(id).onchange=e=>{gazeFollow=e.target.checked;syncGazeOptions();if(!gazeFollow)gazeState.lookDegrees=0;updateCamera(true);};
 syncGazeOptions();
 function syncBodyOptions(){for(const id of ['body-motion','pause-body-motion'])$(id).checked=bodyMotion;}
 for(const id of ['body-motion','pause-body-motion'])$(id).onchange=e=>{bodyMotion=e.target.checked;syncBodyOptions();if(physics){physics.presentationEnabled=bodyMotion;physics.entries.forEach(entry=>physics.sync(entry,false));syncVisuals();}updateCamera(true);};
 syncBodyOptions();
 $('start').onclick=()=>{save.assist=$('assist').checked;save.auto=$('auto-throttle').checked;save.car=selected;save.view=view;resetRace();};
 document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{shopPreview.cancel();selected=b.dataset.car;save.car=selected;refreshPreview();syncOptions();persist();$('shop-status').textContent='차량마다 다른 꾸미기를 저장할 수 있어요.';});
 $('enter-garage').onclick=()=>{atWelcome=false;$('welcome').hidden=true;$('menu').hidden=false;syncOptions();};
 $('title-back').onclick=()=>{cancelShop();atWelcome=true;$('menu').hidden=true;$('welcome').hidden=false;};
 const rotateGarage=delta=>{previewAngle+=delta;preview.rotation.y=previewAngle;if(daylight)renderer.shadowMap.needsUpdate=true;syncGarageView();};garageDrag=bindDragRotation(document.querySelector('.garage-stage'),rotateGarage,{enabled:()=>mode==='menu'&&!atWelcome&&!document.querySelector('dialog[open]')});
 $('rotate-left').onclick=()=>rotateGarage(-Math.PI/4);$('rotate-right').onclick=()=>rotateGarage(Math.PI/4);
 $('shop-cancel').onclick=()=>cancelShop();$('shop-confirm').onclick=()=>{const result=shopPreview.confirm(save,selected);if(!result.ok){renderShop();return;}persist();refreshPreview();syncOptions();$('shop-status').textContent=presentItem(result.item,selected).name+' 장착 완료! '+(result.purchased?result.item.price.toLocaleString()+' C를 사용했어요.':'보유품이라 잔액은 그대로예요.');};
 addEventListener('keydown',e=>{if(e.key==='Escape'&&mode==='menu'&&shopPreview.pending)cancelShop();});document.querySelectorAll('[data-save-transfer-open]').forEach(b=>b.addEventListener('click',()=>{if(shopPreview.pending)cancelShop();}));
 $('assist').onchange=e=>{save.assist=e.target.checked;persist();};$('auto-throttle').onchange=e=>{save.auto=e.target.checked;persist();};$('view-select').onchange=e=>{view=e.target.value;save.view=view;persist();};$('camera').onclick=switchView;$('pause').onclick=setPause;$('resume').onclick=resume;
 for(const id of ['restart','again'])$(id).onclick=resetRace;for(const id of ['back-menu','result-menu'])$(id).onclick=toMenu;
 $('rescue').onclick=()=>{if(mode==='race'){const recovered=physics.recover(player);clearInput();syncVisuals();updateCamera(true);showToast(recovered?'도로에서 다시 출발해요':'다른 차가 지나가면 다시 눌러요');}};
 installRaceTouchGuard({isPlaying:()=>['race','countdown'].includes(mode)});
 steeringControl=installCitySteering({canDrive:()=>['race','countdown'].includes(mode),onChange:clearInput});
 const controlButtons=[...document.querySelectorAll('[data-control]')];
 function paintControls(){for(const b of controlButtons){const on=[...held.values()].includes(b.dataset.control);b.classList.toggle('pressed',on);b.setAttribute('aria-pressed',String(on));}}
 for(const b of controlButtons.filter(b=>!b.dataset.driveTarget)){
  b.onpointerdown=e=>{if(!['race','countdown'].includes(mode)||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();held.set(e.pointerId,b.dataset.control);pointerZones.set(e.pointerId,b.closest('.steering')?'steering':'pedals');b.setPointerCapture(e.pointerId);paintControls();};
  b.onpointermove=e=>{if(!pointerZones.has(e.pointerId))return;e.preventDefault();const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-control]');const zone=hit?(hit.closest('.steering')?'steering':'pedals'):null;held.set(e.pointerId,zone===pointerZones.get(e.pointerId)?hit.dataset.control:null);paintControls();};
  const release=e=>{held.delete(e.pointerId);pointerZones.delete(e.pointerId);paintControls();};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;b.oncontextmenu=e=>e.preventDefault();
 }
 pedalConsole=installDriveConsole({canDrive:()=>['race','countdown'].includes(mode),onPointer:(id,key,active)=>{if(active)held.set(id,key);else held.delete(id);paintControls();}});
 addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||document.querySelector('dialog[open]'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyX','ShiftLeft','ShiftRight'].includes(e.code)){if(['race','countdown'].includes(mode)){e.preventDefault();keys.add(e.code);}}if(e.repeat)return;if(e.code==='KeyC' && ['race','countdown','paused'].includes(mode))switchView();if(['KeyP','Escape'].includes(e.code)){if(mode==='paused')resume();else setPause();}if(e.code==='KeyR' && mode==='race')$('rescue').click();});
 addEventListener('pagehide',()=>drivingSound.stop());addEventListener('visibilitychange',()=>{if(document.hidden)drivingSound.stop();});
 addEventListener('keyup',e=>keys.delete(e.code));installPageActivity({onRelease:clearInput,onSuspend:setPause});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setPause();fail('화면 연결이 잠시 끊겼어요. 다시 열면 저장한 상금은 유지돼요.');});
 for(const name of ['help','credits']){$(name+'-open').onclick=()=>{const dialog=$(name);dialog.showModal();dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});};document.querySelector('[data-close="'+name+'"]').onclick=()=>$(name).close();}
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('load-status').textContent='이 브라우저에서는 가로로 돌려서 플레이해 주세요.';}};
 addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;clearInput();updateCamera(true);camera.updateProjectionMatrix();});
 refreshTransferredSave=()=>{selected=save.car;view=save.view;toMenu();$('shop-status').textContent='저장 기록을 반영했어요. 옮겨 온 차로 달려 보세요.';};
 flowUI=installGarageFlow({study:garageStudy,artStudy,look:daylight?'daylight':'before',onLook:look=>{shopPreview.cancel();persist();const url=new URL(location.href);url.searchParams.set('look',look);url.searchParams.set('garage','1');location.assign(url.href);},getState:()=>({carName:CAR_NAMES[selected],pending:shopPreview.pending,storageOK,notice:lastRace?lastRace.prize.toLocaleString()+' C 획득 · 내 차를 꾸미고 다시 도전해요.':''}),cancel:cancelShop,selectCategory:value=>{category=value;},refresh:renderShop,reset:()=>{save=freshStudySave();selected=save.car;previewAngle=0;shopPreview.cancel();persist();refreshPreview();syncOptions();},onScreen:screen=>{previewAngle=0;preview.rotation.y=0;if(daylight)renderer.shadowMap.needsUpdate=true;}});
 syncOptions();$('enter-garage').disabled=false;$('enter-garage').textContent='차고 문 열기 →';$('welcome-status').textContent='준비 완료 · 너만의 레이스를 시작해 봐!';$('start').disabled=false;$('start').textContent='레이스 출발  →';$('load-status').textContent='준비 완료 · 스마트폰은 가로 화면을 추천해요';
 installRaceCourses({course:COURSE_META,track,onReady:()=>flowUI.race(),getSave:()=>save,getCar:()=>selected,canChoose:()=>mode==='menu'||mode==='result',onOpen:()=>{if(shopPreview.pending)cancelShop();},onChoose:()=>{shopPreview.cancel();save.car=selected;save.view=view;persist();},navigate:url=>{clearInput();if(garageStudy){const next=new URL(url,location.href);next.searchParams.set('study',studyName);if(artStudy)next.searchParams.set('look',daylight?'daylight':'before');next.searchParams.set('layout',flowUI.modern?'new':'classic');location.assign(next.href);}else location.assign(url);}});
 if(garageStudy&&atWelcome)$('enter-garage').click();
 let last=performance.now(),lastDt=1/60,frameCount=0,avgFrame=16,poorFrames=0;
 function frame(now){lastDt=clamp((now-last)/1000,0,.05);last=now;step(lastDt);if(mode!=='menu'){syncVisuals();if(frameCount%3===0)updateHUD();}updateCamera();courseScene.tick(lastDt);courseScene.update(physics?.merge,player);if(toastTime>0){toastTime-=lastDt;if(toastTime<=0)$('toast').classList.remove('visible');}renderScene(false,now);frameCount++;drivingSound.update({player,active:(mode==='race'||mode==='countdown')&&!document.hidden,throttle:mode==='race'&&(input.throttle||(save.auto&&!input.brake&&!input.reverse)),view});driveMeasure.tick(now,{active:mode==='race',visible:!document.hidden,focused:document.hasFocus(),car:selected,view,width:innerWidth,height:innerHeight,ratio:renderer.getPixelRatio(),speed:player?.speed||0});
  avgFrame=avgFrame*.98+lastDt*1000*.02;if(mode==='race' && avgFrame>34)poorFrames++;else poorFrames=Math.max(0,poorFrames-1);if(poorFrames>200 && renderer.getPixelRatio()>1){renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);poorFrames=0;}requestAnimationFrame(frame);
 }
 let mirrorProbeObject=null;
 if(new URLSearchParams(location.search).get('qa')==='1')window.__raceQA={snapshot:()=>({courseScene:courseScene.stats(),trafficRendering:{optimized:trafficOptimized,vehicles:visuals.map(v=>v.rendering?.stats())},audio:drivingSound.stats(),performance:driveMeasure.report(),shopPreview:shopPreview.pending,previewAngle,displayLoadout:shopPreview.loadout(save,selected),vehicleName:CAR_NAMES[selected],appearance:{dimensions:selected==='porsche'?fleet.porsche.dimensions:selected==='tavaculo'?fleet.dimensions:null,...vehicleAppearance(preview),exposure:renderer.toneMappingExposure,environment:daylight?'Kloofendal 48d Partly Cloudy':'Venice Sunset 1K',garage:garage.userData.art||{id:'before'},sharedEnvironment:garageScene.environment===scene.environment},recentImpact,mode,input:{...input},touches:held.size+(steeringControl?.active?1:0),steeringControl:steeringControl?.snapshot(),driveConsole:pedalConsole?.snapshot(),recovery:physics?.recoveryStats(),recoveryCarVisible:visuals[0]?.root.visible,skidCount:skidMesh.count,screen:mode==='menu'?(atWelcome?'welcome':'garage'):mode,loadout:{...save.garage[selected]},owned:[...save.owned],tuning:tuning(save,selected),physicalTuning:physics?.entries[0]?.config,previewMaterials:preview?(()=>{const result=[];preview.traverse(o=>{if(o.isMesh&&(o.material.name==='CarSurface'||o.name==='body'||o.material.name==='study-body'))result.push(o.material.color.getHexString());});return result;})():[],customWheels:preview?.getObjectsByProperty('name','dream-wheel-trim').length,car:selected,view,engine:courseRuntime.description,elapsed,coins:save.coins,races:save.races,best:{...save.best},courseBest:structuredClone(save.courseBest||{}),courseId:COURSE_ID,length,player:player?{...player}:null,racers:racers.map(r=>({...r})),camera:camera.position.toArray(),cameraDirection:camera.getWorldDirection(new T.Vector3()).toArray(),cameraFov:camera.fov,cameraAspect:camera.aspect,cameraNear:camera.near,cameraFar:camera.far,cockpitVisible:cockpit.visible||originalCockpit.group.visible,originalCockpitVisible:originalCockpit.group.visible,proceduralCockpitVisible:cockpit.visible,cockpitStats:selected!=='f2002'?{...originalCockpit.stats(),steering:{...gazeState,target:gazeTarget,follow:gazeFollow,maxLookDegrees:MAX_LOOK_DEGREES,wheelAmount:clamp(-(player?.steeringAngle||0)/.46,-1,1)}}:cockpitVisual.stats(),mirrorStats:rearView.stats(),sideMirrorStats:sideViews.map(s=>({id:s.id,...s.view.stats()})),frameMs:avgFrame,pixelRatio:renderer.getPixelRatio(),carVisible:visuals[0]?.body.visible,wheelCount:visuals[0]?.wheels.length,caliperCounts:visuals[0]?.calipers.map(c=>c.children.length),wheelVisuals:visuals[0]?.wheels.map(w=>({position:w.position.toArray(),quaternion:w.quaternion.toArray()})),caliperVisuals:visuals[0]?.calipers.map(w=>({position:w.position.toArray(),quaternion:w.quaternion.toArray(),visible:w.visible})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,storageOK}),advance:(seconds,drive={throttle:true})=>{for(let t=0;t<seconds;t+=1/60)step(1/60,drive);syncVisuals();updateCamera(true);updateHUD();renderScene(true);},advanceDriver:seconds=>{for(let t=0;t<seconds;t+=1/60){const guide=physics?.route(physics.entries[0]);step(1/60,guide?{...guide,wheelCommand:true}:{brake:1});}syncVisuals();updateCamera(true);updateHUD();renderScene(true);},mirrorPixels:()=>rearView.pixels(),inspectSideMirror:id=>{const side=sideViews.find(s=>s.id===id);if(!side)throw Error("Unknown side mirror");side.view.update({player,enabled:true,force:true,inspect:true,hide:[visuals[0]?.root,cockpit]});return{stats:side.view.stats(),pixels:side.view.pixels()};},mirrorProbe:options=>{
   if(!options){if(mirrorProbeObject){scene.remove(mirrorProbeObject);mirrorProbeObject.geometry.dispose();mirrorProbeObject.material.dispose();mirrorProbeObject=null;}renderScene(true);return null;}
   if(!mirrorProbeObject){mirrorProbeObject=new T.Mesh(new T.BoxGeometry(1.6,1.05,1),new T.MeshBasicMaterial({color:'#00ff00',toneMapped:false,fog:false}));mirrorProbeObject.name='qa-rear-view-probe';scene.add(mirrorProbeObject);}
   const forward=new T.Vector3(Math.sin(player.heading),0,Math.cos(player.heading)),right=new T.Vector3(-forward.z,0,forward.x);
   mirrorProbeObject.position.set(player.x,(player.y||0)+1.05,player.z).addScaledVector(forward,(options.behind===false?1:-1)*(options.distance||12)).addScaledVector(right,options.x||0);mirrorProbeObject.rotation.y=player.heading;
   renderScene(true);return{position:mirrorProbeObject.position.toArray(),xMeaning:'driver right positive',behind:options.behind!==false};
  },placeOffCourse:({s=length*.04,lateral=20}={})=>{if(!window.__cockpitReviewStorageIsolated)throw Error('Local isolated review only');clearInput();const e=physics.entries[0],f=trackFrame(track,s);e.recovery.anchorS=f.s;Object.assign(e.s,{x:f.x+f.rx*lateral,z:f.z+f.rz*lateral,heading:Math.atan2(f.tx,f.tz),u:0,v:0,yawRate:0});physics.placeBody(e);physics.sync(e,false);syncVisuals();updateCamera(true);renderScene(true);},setWheelInspection:value=>{wheelInspection=!!value;updateCamera(true);},setAssist:value=>{save.assist=value;},track:()=>track,reviewScene:({progress=.34,closing=null,side=false}={})=>{
   if(!window.__cockpitReviewStorageIsolated)throw Error('Local isolated review only');
   recentImpact=null;clearInput();
   const base=trackFrame(track,progress*length),heading=Math.atan2(base.tx,base.tz);
   physics.entries.forEach((e,i)=>{const impact=closing!==null&&i<2,offset=i===0?0:i===1?(side?1:5):60+i*12;
    const f=impact?base:trackFrame(track,progress*length+offset),lane=impact&&i===0&&side?-2.3:0;
    Object.assign(e.s,{x:f.x+f.rx*lane+(impact?base.tx*offset:0),z:f.z+f.rz*lane+(impact?base.tz*offset:0),heading:impact?heading:Math.atan2(f.tx,f.tz),u:closing===null?0:side?15:i===0?20:20-closing,v:side&&i===0?closing:0,yawRate:0,steer:0,powerSlip:0,ax:0,ay:0});
    Object.assign(e.r,{distance:progress*length+offset,s:progress*length+offset,finished:false,gate:Math.floor(progress*4)});e.motion.roll=e.motion.pitch=e.motion.rollVelocity=e.motion.pitchVelocity=0;e.impactRecovery=0;e.collisionAt=-10;physics.sync(e,false);
   });
   if(closing!==null){physics.route=()=>({steer:0});for(let i=0;i<100&&!recentImpact;i++)step(1/120,{steer:0});for(let i=0;i<7;i++)step(1/120,{steer:0});}
   syncVisuals();updateCamera(true);updateHUD();renderScene(true);return recentImpact;
  }};
 // Asset loading can span a phone rotation before the resize listener exists.
 renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
 updateCamera(true);requestAnimationFrame(frame);
}
function formatTime(seconds){const minutes=Math.floor(seconds/60);return minutes+':'+(seconds%60).toFixed(2).padStart(5,'0');}
