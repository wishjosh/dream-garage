import {setCabinUp} from './cockpit-attitude.mjs?v=cabin-layout-1';
import {createCityCourse,COURSE_ID,COURSE_NAME,SECTORS,courseSector} from './city-course.mjs?v=city-tour-1';
import {createImpactSound} from './collision-feel.mjs?v=city-tour-1';
import {installCitySteering} from './city-steering.mjs?v=city-tour-1';
import {installSaveTransfer} from './save-transfer-ui.mjs?v=city-tour-1';
import {SAVE_KEY} from './save-transfer.mjs?v=city-tour-1';
import {createCockpit} from './cockpit-visual.mjs?v=gallardo-cockpit-1';
import {createRearView} from './rear-view.mjs?v=original-city-1';
import {createOriginalCockpit} from './original-cockpit.mjs?v=cabin-layout-1';
import {createSteeringState,stepSteering,MAX_LOOK_DEGREES} from './cockpit-study-steering.mjs?v=steering-look-1';
import {splitWheelVisuals,syncWheelVisuals} from './wheel-visual.mjs?v=wheels-1';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {clamp,mod,trackFrame,nearestTrack,makeRacer,rankOf,finishRacer,PRIZES} from './race-core.mjs?v=city-tour-1';
import {RacePhysics,FIXED_DT} from './race-handling.mjs?v=city-tour-1';
import {CATALOG,CATEGORIES,normalizeSave,transact,tuning,itemById} from './garage-core.mjs?v=city-tour-1';
import {dressCar,disposeDress,buildGarage} from './garage-visual.mjs?v=design-1';

const $=id=>document.getElementById(id),canvas=$('world');
const SAVE=SAVE_KEY;
let save=normalizeSave(null),storageOK=true;
try{save=normalizeSave(JSON.parse(localStorage.getItem(SAVE)||'null'));}catch{storageOK=false;}
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(save));}catch{storageOK=false;}}
// The transfer tools work before the 3D assets finish loading.
let refreshTransferredSave=null;
installSaveTransfer({getSave:()=>save,onSaveChanged:next=>{save=next;storageOK=true;refreshTransferredSave?.();}});
function fail(message){$('fatal-message').textContent=message;$('fatal').hidden=false;}
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{fail('Safari 또는 Chrome 최신 버전에서 다시 열어 주세요.');}
if(renderer)boot().catch(e=>{console.error(e);fail('차량이나 도시를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 열어 주세요.');});

async function boot(){
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.97;
 const scene=new T.Scene();scene.background=new T.Color('#101e34');scene.fog=new T.FogExp2('#1b2e47',.003);
 const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.12,700);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;pmrem.dispose();room.dispose();
 scene.environmentIntensity=.65;scene.add(new T.HemisphereLight('#bbd7ed','#182736',1.3));
 const moon=new T.DirectionalLight('#a7cfff',1.5);moon.position.set(-35,70,-30);scene.add(moon);
 const warm=new T.DirectionalLight('#ffd0ad',.7);warm.position.set(50,20,60);scene.add(warm);
 const unit=new T.BoxGeometry(1,1,1),palette={};
 const basic=color=>new T.MeshBasicMaterial({color});
 const material=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const mats={road:material('#707c87',.86),walk:material('#64778a'),navy:material('#142b43'),white:material('#c1d3de'),cyan:basic('#66f4f1'),pink:basic('#ff7197'),gold:basic('#ffdc9d'),dark:material('#143b53',.3,.5)};
 function box(w,h,d,x,y,z,mat=mats.navy,parent=scene){const m=new T.Mesh(unit,mat);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
 const track=createCityCourse(),{length,frames}=track,N=frames.length;
 function ribbon(width,y,mat){
  const v=[],uv=[],idx=[];for(let i=0;i<=N;i++){const f=frames[i%N];for(const k of [-1,1]){v.push(f.x+f.rx*width*k,y,f.z+f.rz*width*k);uv.push((k+1)*width/7,i/N*length/7);}if(i<N){let a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,mat);scene.add(mesh);return mesh;
 }
 box(1400,.5,1400,-100,-.6,30,material('#163d43'));
 const bay=new T.Mesh(new T.PlaneGeometry(370,600,1,1),new T.MeshStandardMaterial({color:'#08617d',roughness:.28,metalness:.55,emissive:'#073b59',emissiveIntensity:.4}));bay.rotation.x=-Math.PI/2;bay.position.set(199,-.12,170);scene.add(bay);const northBay=new T.Mesh(new T.PlaneGeometry(500,150),bay.material);northBay.rotation.x=-Math.PI/2;northBay.position.set(-140,-.12,440);scene.add(northBay);
 ribbon(12,0,mats.walk);ribbon(8.2,.045,mats.road);
 const asphalt=await new T.TextureLoader().loadAsync('./assets/materials/asphalt-color.jpg');asphalt.colorSpace=T.SRGBColorSpace;asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);mats.road.map=asphalt;mats.road.needsUpdate=true;
 function instances(geo,mat,items){const inst=new T.InstancedMesh(geo,mat,items.length),o=new T.Object3D();items.forEach((a,i)=>{o.position.set(...a.pos);o.rotation.set(0,a.angle||0,0);o.scale.set(...a.scale);o.updateMatrix();inst.setMatrixAt(i,o.matrix);if(a.color)inst.setColorAt(i,new T.Color(a.color));});inst.instanceMatrix.needsUpdate=true;scene.add(inst);return inst;}
 const blocks=[],leds=[],curbs=[],marks=[],poles=[],arms=[],lamps=[];
 const segmentCount=Math.floor(length/5);
 for(let i=0;i<segmentCount;i++){
  const s=i/segmentCount*length,f=trackFrame(track,s),yaw=Math.atan2(f.tx,f.tz);
  for(const side of [-1,1]){
   blocks.push({pos:[f.x+f.rx*side*8.8,.64,f.z+f.rz*side*8.8],scale:[.44,1.05,length/segmentCount-.12],angle:yaw,color:i%3?'#183149':'#c3d7df'});
   leds.push({pos:[f.x+f.rx*side*8.55,.96,f.z+f.rz*side*8.55],scale:[.05,.1,length/segmentCount-.3],angle:yaw,color:side===1?'#62eef0':'#ff7197'});
   curbs.push({pos:[f.x+f.rx*side*7.9,.09,f.z+f.rz*side*7.9],scale:[.55,.07,length/segmentCount-.08],angle:yaw,color:i%2?'#e6f0f6':'#ff7499'});
  }
  if(i%2===0)marks.push({pos:[f.x,.055,f.z],scale:[.13,.012,3.2],angle:yaw});
  if(i%5===0){for(const side of [-1,1]){
   const x=f.x+f.rx*side*10.6,z=f.z+f.rz*side*10.6;
   poles.push({pos:[x,4.8,z],scale:[.12,9.6,.12]});arms.push({pos:[x-f.rx*side*1.3,9.6,z-f.rz*side*1.3],scale:[2.8,.12,.13],angle:yaw});
   lamps.push({pos:[x-f.rx*side*2.6,9.5,z-f.rz*side*2.6],scale:[1.5,.1,.8],angle:yaw});
  }}
 }
 instances(unit,mats.white,blocks);instances(unit,basic('#ffffff'),leds);instances(unit,basic('#ffffff'),curbs);instances(unit,mats.white,marks);instances(unit,mats.navy,poles);instances(unit,mats.navy,arms);instances(unit,basic('#e5ffff'),lamps);
 // A single shared texture and instanced windows keep the skyline light on mobile.
 function windowTexture(){const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d');x.fillStyle='#12374c';x.fillRect(0,0,128,256);for(let row=0;row<16;row++)for(let col=0;col<6;col++){const n=(row*31+col*17)%9;if(n<6){x.fillStyle=n<4?'#f9ca85':'#78c6dc';x.fillRect(7+col*20,7+row*16,9,8);}}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
 const wintex=windowTexture(),buildingMat=new T.MeshStandardMaterial({map:wintex,emissiveMap:wintex,emissive:'#ffffff',emissiveIntensity:.6,roughness:.55});
 for(let i=0;i<17;i++){
  const x=45+(i%5)*19,z=30+Math.floor(i/5)*33,h=22+(i*17)%39,w=9+(i%3)*3;
  box(w,h,12,x,h/2,z,buildingMat);box(w+.4,.25,12.4,x,h+.1,z,i%2?mats.cyan:mats.pink);
  const reflection=new T.Mesh(new T.PlaneGeometry(w*.8,h*.72),new T.MeshBasicMaterial({map:wintex,color:'#337e99',transparent:true,opacity:.15,depthWrite:false}));reflection.rotation.x=-Math.PI/2;reflection.position.set(x,-.09,z-h*.28);scene.add(reflection);
 }
 // Broad public promenade and a small pier for the wheel.
 box(6,.32,145,14,.0,54,mats.walk);box(34,.4,10,38,-.05,83,mats.navy);
 const rails=[];for(let z=-15;z<126;z+=5){rails.push({pos:[17,.7,z],scale:[.06,1.3,.06]});}instances(unit,mats.white,rails);box(.06,.06,145,17,1.35,54,mats.cyan);
 const wheel=new T.Group();wheel.position.set(57,25,90);wheel.rotation.y=-.15;scene.add(wheel);
 for(const z of [-.6,.6]){const rim=new T.Mesh(new T.TorusGeometry(21,.13,5,80),mats.cyan);rim.position.z=z;wheel.add(rim);}
 const spoke=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;spoke.push(0,0,0,Math.cos(a)*21,Math.sin(a)*21,0);}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(spoke,3));wheel.add(new T.LineSegments(sg,new T.LineBasicMaterial({color:'#9dc7df'})));
 const capsules=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const c=box(1.6,1.4,1.5,Math.cos(a)*21,Math.sin(a)*21,0,i%2?mats.pink:mats.gold,wheel);capsules.push(c);}
 function beam(a,b,r,mat,parent=scene){const d=new T.Vector3().subVectors(b,a),o=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),6),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(o);return o;}
 beam(new T.Vector3(48,0,90),new T.Vector3(57,25,90),.42,mats.white);beam(new T.Vector3(66,0,90),new T.Vector3(57,25,90),.42,mats.white);
 function sign(label,w,h){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#102d44';x.fillRect(0,0,1024,256);x.fillStyle='#71eeee';x.fillRect(0,244,1024,12);x.textAlign='center';x.textBaseline='middle';x.font='700 80px system-ui';x.fillStyle='#f0ffff';x.fillText(label,512,115);x.font='500 26px system-ui';x.fillStyle='#8bdbe8';x.fillText('B A Y F R O N T   N I G H T   R A C E',512,204);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));}
 function gantry(s,label){const f=trackFrame(track,s),g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=Math.atan2(f.tx,f.tz);scene.add(g);box(.4,8.4,.5,-9,4.2,0,mats.navy,g);box(.4,8.4,.5,9,4.2,0,mats.navy,g);box(.1,7.8,.1,-8.8,4,0,mats.pink,g);box(.1,7.8,.1,8.8,4,0,mats.cyan,g);const p=sign(label,18.8,2.9);p.position.set(0,8.2,0);p.rotation.y=Math.PI;g.add(p);return g;}
 gantry(14,'SPEED GRAND PRIX');for(const sector of SECTORS.slice(1))gantry(length*sector.at,sector.sign);
 const startframe=trackFrame(track,0),startmarks=[];for(let row=0;row<2;row++)for(let col=0;col<16;col++){const f=trackFrame(track,row*.7),l=-7.5+col;startmarks.push({pos:[f.x+f.rx*l,.065,f.z+f.rz*l],scale:[.9,.018,.65],angle:Math.atan2(f.tx,f.tz),color:(row+col)%2?'#d7ecf5':'#243447'});}instances(unit,basic('#ffffff'),startmarks);

 const gltf=new GLTFLoader(),models={};let loaded=0;
 const originalCockpitPromise=createOriginalCockpit({scene,camera,loader:gltf});
 const items=['tavaculo','f2002','building-e','building-h','building-n','building-skyscraper-a','building-skyscraper-b','building-skyscraper-c','building-skyscraper-d','tree_palmBend','tree_palmDetailedTall'];
 function normalize(ob,target){ob.updateMatrixWorld(true);let b=new T.Box3().setFromObject(ob);const size=b.getSize(new T.Vector3());if(target){ob.scale.multiplyScalar(target/Math.max(size.x,size.z));ob.updateMatrixWorld(true);b=new T.Box3().setFromObject(ob);}const center=b.getCenter(new T.Vector3());const group=new T.Group();group.add(ob);ob.position.x-=center.x;ob.position.z-=center.z;ob.position.y-=b.min.y;return group;}
 const rigs=await fetch('./assets/vehicle-rigs.json').then(r=>{if(!r.ok)throw Error('Missing wheel rig');return r.json();});
 await Promise.all(items.map(async name=>{const vehicle=name==='tavaculo'||name==='f2002';const asset=await gltf.loadAsync('./assets/'+name+(vehicle?'-rigged':'')+'.glb'+(vehicle?'?v=wheels-1':''));if(name==='tavaculo')asset.scene.traverse(o=>{if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.name==='CarSurface'){m.metalness=.62;m.roughness=.25;}});}});models[name]=normalize(asset.scene,name==='tavaculo'?4.7:name==='f2002'?5.2:null);loaded++;$('load-status').textContent=`차량과 도시 준비 ${Math.round(loaded/items.length*100)}%`;}));
 const buildings=items.filter(n=>n.startsWith('building'));
 function place(name,x,z,scale,rotation=0){const ob=models[name].clone(true);ob.position.set(x,.08,z);ob.scale.setScalar(scale);ob.rotation.y=rotation;scene.add(ob);return ob;}
 for(let i=0;i<30;i++){
  const s=i/30*length,f=trackFrame(track,s),side=i%3?1:-1;
  // Keep the bay side of the first straight open.
  const outer=(s<length*.23?-1:side),offset=25+(i%3)*9;
  const bx=f.x+f.rx*outer*offset,bz=f.z+f.rz*outer*offset;
  if(nearestTrack(track,bx,bz).distance>24)place(buildings[i%buildings.length],bx,bz,5+(i%4),Math.atan2(f.tx,f.tz));
 }
 for(let i=0;i<28;i++){
  const f=trackFrame(track,i/28*length);for(const side of [-1,1])place(i%2?'tree_palmBend':'tree_palmDetailedTall',f.x+f.rx*13.5*side,f.z+f.rz*13.5*side,3.5, i*.9);
 }

 // Instanced silhouettes add district variety without cloning more detailed models.
 const towers=[],roofs=[];
 for(let i=0;i<90;i++){const f=trackFrame(track,i/90*length),side=i%2?1:-1,offset=34+i%3*14,x=f.x+f.rx*side*offset,z=f.z+f.rz*side*offset;
  if(nearestTrack(track,x,z).distance<25||(f.x>-20&&side===1))continue;
  const garden=i/90>.46&&i/90<.63,h=garden?8+i%4*2:18+i*17%48,w=8+i%3*3;
  towers.push({pos:[x,h/2,z],scale:[w,h,12],angle:Math.atan2(f.tx,f.tz)});roofs.push({pos:[x,h+.15,z],scale:[w+.2,.25,12.2],angle:Math.atan2(f.tx,f.tz),color:garden?'#73e9ad':i%2?'#71eeee':'#ff7197'});
 }
 const shrubs=[],beds=[];for(let i=0;i<36;i++){const f=trackFrame(track,(.46+i/36*.17)*length);for(const side of [-1,1]){const x=f.x+f.rx*side*15,z=f.z+f.rz*side*15;if(nearestTrack(track,x,z).distance<13)continue;shrubs.push({pos:[x,1.5,z],scale:[2.5,1.5,2.5]});beds.push({pos:[x,.4,z],scale:[5,.8,5],angle:Math.atan2(f.tx,f.tz)});}}
 instances(new T.SphereGeometry(1,7,5),material('#397b64'),shrubs);instances(unit,mats.walk,beds);
 instances(unit,buildingMat,towers);instances(unit,basic('#ffffff'),roofs);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sx=shadowCanvas.getContext('2d'),grad=sx.createRadialGradient(32,32,6,32,32,32);grad.addColorStop(0,'#000b');grad.addColorStop(1,'#0000');sx.fillStyle=grad;sx.fillRect(0,0,64,64);const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
 let wheelInspection=false;
 let selected=save.car==='f2002'?'f2002':'tavaculo',view=save.view==='cockpit'?'cockpit':'chase',mode='menu',count=0,elapsed=0,awarded=false,player,racers=[],visuals=[],toastTime=0,pausedFrom='race',physics=null;
 if(new URLSearchParams(location.search).get('view')==='cockpit')view='cockpit';
 const impactSound=createImpactSound();
 for(const kind of ['pointerdown','keydown'])addEventListener(kind,()=>impactSound.unlock(),{passive:true});
 for(const id of ['impact-audio','pause-impact-audio'])$(id).onchange=e=>{impactSound.enabled=e.target.checked;for(const name of ['impact-audio','pause-impact-audio'])$(name).checked=e.target.checked;};
 let steeringControl=null,recentImpact=null;
 const input={left:false,right:false,throttle:false,brake:false,reverse:false,drift:false};const held=new Map(),pointerZones=new Map(),keys=new Set();
 const garage=buildGarage(scene);let preview,previewAngle=0,category='paint',atWelcome=true;
 function refreshPreview(){if(preview){scene.remove(preview);disposeDress(preview);}preview=dressCar(models[selected].clone(true),selected,save.garage[selected],rigs[selected]);preview.position.set(0,.24,-110);preview.rotation.y=previewAngle;scene.add(preview);}
 refreshPreview();
 const originalCockpit=await originalCockpitPromise;
 const gazeState=createSteeringState();let gazeFollow=true,gazeTarget=0,bodyMotion=true;
 function resetGaze(){gazeState.amount=0;gazeState.lookDegrees=0;gazeTarget=0;originalCockpit.reset();}
 const cockpitVisual=createCockpit(camera),cockpit=cockpitVisual.group;scene.add(camera);
 const rearView=createRearView({renderer,scene,camera,cockpit:originalCockpit.group,surface:originalCockpit.mirrorSurface});
 function renderMirror(force=false,now=performance.now()){rearView.update({player,enabled:originalCockpit.group.visible&&selected==='tavaculo'&&mode!=='menu'&&!wheelInspection,paused:mode==='paused'||mode==='result',force,now,frameMs:avgFrame,portrait:innerHeight>innerWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,hide:[visuals[0]?.root,cockpit]});}
 function renderScene(forceMirror=false,now=performance.now()){renderMirror(forceMirror,now);renderer.render(scene,camera);}
 const cameraTarget=new T.Vector3(),lookTarget=new T.Vector3(),desired=new T.Vector3();
 function renderShop(){
  $('shop-tabs').innerHTML=Object.entries(CATEGORIES).map(([key,name])=>`<button data-category="${key}" class="${key===category?'selected':''}" aria-pressed="${key===category}">${name}</button>`).join('');
  $('shop-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderShop();});
  $('shop-items').innerHTML=CATALOG.filter(i=>i.category===category).map(item=>{
   const owned=save.owned.includes(item.id),equipped=save.garage[selected][category]===item.id,poor=!owned&&save.coins<item.price;
   return `<article class="shop-item ${equipped?'equipped':''}"><div class="item-title"><span class="swatch ${category==='wheels'?'wheel-swatch':''}" style="--swatch:${item.color||'#526577'}"></span><strong>${item.name}</strong></div><p>${item.description}</p><span class="item-price ${equipped?'equipped-label':''}">${equipped?'✓ 장착 중':owned?'보유 중 · 재장착 무료':item.price.toLocaleString()+' C'}</span><button data-item="${item.id}" data-poor="${poor}" ${equipped||poor?'disabled':''}>${equipped?'장착 완료':owned?'장착하기':poor?(item.price-save.coins).toLocaleString()+' C 더 필요':'구매하고 장착'}</button></article>`;
  }).join('');
  $('shop-items').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{
   const result=transact(save,selected,b.dataset.item);if(!result.ok)return;
   persist();refreshPreview();syncOptions();$('shop-status').textContent=(result.purchased?result.item.price.toLocaleString()+' C로 구매했어요. ':'보유한 물건을 다시 장착했어요. ')+result.item.name+' 장착 완료!';
  });
 }
 function syncOptions(){document.querySelectorAll('[data-car]').forEach(b=>{const on=b.dataset.car===selected;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('view-select').value=view;$('assist').checked=!!save.assist;$('auto-throttle').checked=!!save.auto;$('wallet').textContent=save.coins.toLocaleString()+' C';const best=save.courseBest?.[COURSE_ID]?.[selected],previous=save.best[selected];$('best').textContent=(Number.isFinite(best)?'시티 투어 최고 '+formatTime(best):'시티 투어 첫 기록에 도전해요')+(Number.isFinite(previous)?' · 이전 코스 '+formatTime(previous):'');
  $('preview-name').textContent=selected==='tavaculo'?'Tavaculo':'클래식 F2002';$('preview-style').textContent=itemById(save.garage[selected].paint).name+' · '+itemById(save.garage[selected].wheels).name;
  const t=tuning(save,selected);$('tuning-stats').innerHTML=[['엔진 힘',t.force],['최고속도',t.maxSpeed],['접지',t.grip],['제동',t.brake]].map(([name,value])=>`<span>${name} ${value>1?'+'+Math.round((value-1)*100)+'%':'기본'}</span>`).join('');
  $('garage-story').textContent=storageOK?(save.races?'지금까지 '+save.races+'번 완주! 우리 차를 꾸미고 다음 경주에 도전해요.':'첫 번째 완주가 꿈의 시작! 경주에서 상금을 모아 봐요.'):'저장이 제한된 브라우저예요. 이 창을 닫으면 상금과 꾸미기가 사라질 수 있어요.';renderShop();
 }
 function updateCamera(snap=false){
  camera.near=.12;originalCockpit.group.visible=false;
  if(mode==='menu'){
   cockpit.visible=false;garage.visible=true;camera.up.set(0,1,0);const portrait=innerWidth<=700&&innerHeight>innerWidth;garage.userData.sign.visible=!portrait;camera.position.set(6.1,2.6,-118.1);camera.lookAt(0,.95,-110);camera.fov=portrait?56:45;const panelWidth=$('menu').hidden?0:$('menu').querySelector('.garage-panel').getBoundingClientRect().width;camera.setViewOffset(innerWidth,innerHeight,portrait?0:atWelcome?-innerWidth*.22:panelWidth*.5+18,portrait?innerHeight*.30:0,innerWidth,innerHeight);camera.updateProjectionMatrix();return;
  }
  garage.visible=false;camera.clearViewOffset();
  const direction=new T.Vector3(Math.sin(player.heading),0,Math.cos(player.heading));
  if(wheelInspection){cockpit.visible=false;visuals[0].body.visible=true;visuals[0].wheels.forEach(w=>w.visible=true);visuals[0].calipers.forEach(w=>w.visible=true);const right=new T.Vector3(direction.z,0,-direction.x);camera.up.set(0,1,0);camera.position.set(player.x,(player.y||0)+1.55,player.z).addScaledVector(direction,2.4).addScaledVector(right,3.7);const target=new T.Vector3(player.x,(player.y||0)+.48,player.z).addScaledVector(direction,.45);camera.lookAt(target);camera.fov=46;camera.updateProjectionMatrix();return;}

  cockpit.visible=view==='cockpit'&&selected==='f2002';originalCockpit.group.visible=view==='cockpit'&&selected==='tavaculo';document.body.dataset.view=view;document.body.dataset.car=selected;
  originalCockpit.mirrorMount.visible=innerWidth>=innerHeight;
  originalCockpit.update({player,steeringAmount:clamp(-player.steeringAngle/.46,-1,1),lookDegrees:gazeState.lookDegrees,now:performance.now()});
  cockpitVisual.update({car:selected,speed:player.speed,forwardSpeed:player.forwardSpeed,driveMode:player.driveMode,steeringAngle:player.steeringAngle,aspect:camera.aspect,paint:itemById(save.garage[selected].paint).color});
  visuals[0].body.visible=view!=='cockpit';
  visuals[0].wheels.forEach(w=>w.visible=view!=='cockpit');visuals[0].calipers.forEach(w=>w.visible=view!=='cockpit');
  if(view==='cockpit'&&selected==='tavaculo'){
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
   camera.position.lerp(desired,snap?1:1-Math.exp(-lastDt*6));cameraTarget.set(player.x+direction.x*6,.85,player.z+direction.z*6);lookTarget.lerp(cameraTarget,snap?1:1-Math.exp(-lastDt*9));camera.lookAt(lookTarget);
  }
  camera.updateProjectionMatrix();$('camera').textContent=view==='chase'?'운전석':'차 뒤';$('camera').setAttribute('aria-label',view==='chase'?'운전석 시점으로 전환':'차 뒤 시점으로 전환');
 }
 const skidMesh=new T.InstancedMesh(unit,new T.MeshBasicMaterial({color:'#10202b',transparent:true,opacity:.52,depthWrite:false}),180);skidMesh.count=0;skidMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);skidMesh.frustumCulled=false;scene.add(skidMesh);let skidIndex=0,skidTime=0,previousSkids=null;const skidObject=new T.Object3D();
 function resetSkids(){skidMesh.count=0;skidIndex=0;skidTime=0;previousSkids=null;}
 function updateSkids(dt){if(!player?.drifting){previousSkids=null;return;}skidTime+=dt;if(skidTime<.06)return;skidTime=0;const rear=player.wheels.slice(2).map(w=>({x:w.position[0],z:w.position[2]}));if(previousSkids)rear.forEach((p,i)=>{const old=previousSkids[i],dx=p.x-old.x,dz=p.z-old.z,len=Math.hypot(dx,dz);if(len<.02||len>6)return;skidObject.position.set((p.x+old.x)/2,.075,(p.z+old.z)/2);skidObject.rotation.set(0,Math.atan2(dx,dz),0);skidObject.scale.set(.18,.009,len+.03);skidObject.updateMatrix();skidMesh.setMatrixAt(skidIndex,skidObject.matrix);skidIndex=(skidIndex+1)%180;skidMesh.count=Math.min(180,skidMesh.count+1);});previousSkids=rear;skidMesh.instanceMatrix.needsUpdate=true;}
 function clearInput(){steeringControl?.clear();resetGaze();held.clear();pointerZones.clear();keys.clear();Object.keys(input).forEach(k=>input[k]=false);document.querySelectorAll('[data-control]').forEach(b=>{b.classList.remove('pressed');b.setAttribute('aria-pressed','false');});}
 function readInput(){for(const k of Object.keys(input))input[k]=[...held.values()].includes(k);input.left ||= keys.has('ArrowLeft')||keys.has('KeyA');input.right ||=keys.has('ArrowRight')||keys.has('KeyD');input.throttle ||=keys.has('ArrowUp')||keys.has('KeyW');input.brake ||=keys.has('ArrowDown')||keys.has('KeyS')||keys.has('Space');input.reverse ||=keys.has('KeyX');input.drift ||=keys.has('ShiftLeft')||keys.has('ShiftRight');}
 function showToast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastTime=2.5;}
 function resetRace(){
  physics?.dispose();resetSkids();
  visuals.forEach(v=>{scene.remove(v.root);disposeDress(v.body);});visuals=[];if(preview)preview.visible=false;
  player=makeRacer(track,{car:selected,lane:-2.3});racers=[player,...[0,1,2].map((i)=>makeRacer(track,{id:'bot'+i,car:i===1?'tavaculo':'f2002',s:7+i*7,lane:i%2?-2.3:2.3}))];
  for(const r of racers){const root=new T.Group(),body=models[r.car].clone(true);if(r===player)dressCar(body,r.car,save.garage[selected],rigs[r.car]);root.add(body);const {wheels,calipers}=splitWheelVisuals(body,rigs[r.car]);wheels.forEach(w=>root.add(w));calipers.forEach(c=>root.add(c));const shadow=new T.Mesh(new T.PlaneGeometry(3.6,6.0),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.06;root.add(shadow);scene.add(root);visuals.push({root,body,wheels,calipers,shadow});}
  physics=new RacePhysics(track,racers,rigs,{playerTuning:tuning(save,selected)});physics.presentationEnabled=bodyMotion;
  elapsed=0;awarded=false;count=3.3;clearInput();mode='countdown';$('welcome').hidden=true;$('menu').hidden=$('pause-menu').hidden=$('result').hidden=true;$('hud').hidden=false;$('countdown').hidden=false;syncVisuals();updateCamera(true);persist();
 }
 function syncVisuals(){racers.forEach((r,i)=>{const v=visuals[i];v.body.position.set(r.x,r.y??.045,r.z);v.body.quaternion.fromArray(r.quaternion||[0,0,0,1]);v.shadow.position.set(r.x,.062,r.z);v.shadow.rotation.z=-r.heading;syncWheelVisuals(v.wheels,v.calipers,r.wheels);});}
 function toMenu(){clearInput();mode='menu';physics?.dispose();physics=null;$('hud').hidden=$('result').hidden=$('pause-menu').hidden=$('countdown').hidden=true;$('welcome').hidden=true;$('menu').hidden=false;atWelcome=false;visuals.forEach(v=>{scene.remove(v.root);disposeDress(v.body);});visuals=[];refreshPreview();preview.visible=true;syncOptions();updateCamera(true);}
 function setPause(){if(!['race','countdown'].includes(mode))return;pausedFrom=mode;mode='paused';clearInput();updateCamera(true);$('pause-menu').hidden=false;$('pause-menu').querySelector('.compact').scrollTop=0;$('countdown').hidden=true;}
 function resume(){mode=pausedFrom;$('pause-menu').hidden=true;$('countdown').hidden=mode!=='countdown';last=performance.now();}
 function switchView(){resetGaze();view=view==='chase'?'cockpit':'chase';save.view=view;persist();updateCamera(true);}
 function finish(){
  if(awarded)return;awarded=true;mode='result';clearInput();const rank=rankOf(player,racers),prize=PRIZES[rank-1];save.coins+=prize;save.races++;save.courseBest??={};save.courseBest[COURSE_ID]??={};const old=save.courseBest[COURSE_ID][selected],record=!Number.isFinite(old)||elapsed<old;if(record)save.courseBest[COURSE_ID][selected]=elapsed;persist();
  $('result-title').textContent=rank===1?'우승했어요!':'멋지게 완주했어요!';$('result-rank').textContent=rank+'위';$('result-time').textContent='완주 기록 '+formatTime(elapsed);$('prize').textContent='+'+prize.toLocaleString()+' C';$('total-prize').textContent='모은 상금 '+save.coins.toLocaleString()+' C';$('record-note').textContent=storageOK?(record?'나의 최고 기록을 세웠어요!':'다음 경주에도 도전해요!'):'이 브라우저에서는 기록을 저장할 수 없어요.';$('result-story').textContent=save.races===1?'첫 상금이야! 차고에서 우리 차를 꾸며 볼까?':'이번 상금으로 다음 레이스를 준비해요!';$('result').hidden=false;$('result').querySelector('.compact').scrollTop=0;
 }
 function step(dt,forcedInput=null){
  if(mode==='countdown'){count-=dt;$('countdown').textContent=count>.3?Math.ceil(count-.3):'GO!';if(count<=0){mode='race';$('countdown').hidden=true;}return;}
  if(mode!=='race')return;
  readInput();const drive=forcedInput||{...input,...(steeringControl?.mode==='slide'&&!input.left&&!input.right?{steer:steeringControl.value}:{}),throttle:input.throttle||(save.auto&&!input.reverse&&!input.brake&&(player.forwardSpeed||0)>-.2)};const wasBlocked=player.reverseBlocked;const result=physics.step(dt,drive,save.assist);if(player.reverseBlocked&&!wasBlocked)showToast('멈춘 뒤 후진을 떼었다 다시 눌러요');updateSkids(result.steps*FIXED_DT);elapsed+=result.steps*FIXED_DT;
  gazeTarget=selected==='tavaculo'&&view==='cockpit'&&((!!drive.left!==!!drive.right)||(steeringControl?.active&&Number.isFinite(drive.steer)&&Math.abs(drive.steer)>.001))?clamp(-player.steeringAngle/.46,-1,1):0;
  stepSteering(gazeState,gazeTarget,result.steps*FIXED_DT,gazeFollow);
  for(const hit of result.hits)if(hit.id===player.id){recentImpact={...hit};impactSound.play(hit);if(hit.level!=='light')showToast(hit.level==='heavy'?'큰 충돌 · 속도를 줄이고 자세를 잡아요':hit.kind==='car'?'접촉 · 방향을 다시 맞춰요':'벽에 닿았어요 · 속도를 줄여요');}
  racers.slice(1).forEach(r=>finishRacer(r,track,elapsed));
  if(finishRacer(player,track,elapsed))finish();
 }
 const mapctx=$('map').getContext('2d'),bounds=track.bounds;
 const mp=(x,z)=>[(x-bounds.xmin)/(bounds.xmax-bounds.xmin)*220+10,190-(z-bounds.zmin)/(bounds.zmax-bounds.zmin)*180];
 function drawMap(){mapctx.clearRect(0,0,240,200);mapctx.strokeStyle='#6b91aa';mapctx.lineWidth=6;mapctx.lineJoin='round';mapctx.beginPath();frames.forEach((f,i)=>{const p=mp(f.x,f.z);i?mapctx.lineTo(...p):mapctx.moveTo(...p);});mapctx.closePath();mapctx.stroke();racers.slice().reverse().forEach(r=>{const p=mp(r.x,r.z);mapctx.fillStyle=r===player?'#83fff2':'#ff93b2';mapctx.beginPath();mapctx.arc(...p,r===player?5.5:3.8,0,Math.PI*2);mapctx.fill();});}
 function updateHUD(){if(!player)return;$('speed').textContent=Math.round(player.speed*3.6);$('gear').textContent=player.forwardSpeed<-.25||player.driveMode==='reverse'?'R':Math.round(player.speed*3.6)<1?'N':Math.min(6,Math.floor(Math.round(player.speed*3.6)/37)+1);const state=player.reverseBlocked?'멈춘 뒤 후진을 다시 눌러요':player.drifting?'드리프트 · 가속 유지':player.driveMode==='reverse'||player.forwardSpeed<-.25?'후진 · R':player.braking?'브레이크':physics?.advice(player)||courseSector(player.distance/length).name;$('drive-state').textContent=state;$('drive-state').classList.toggle('drifting',!!player.drifting);$('rank').innerHTML=rankOf(player,racers)+'<span>/ 4</span>';$('progress').innerHTML=Math.floor(clamp(player.distance/length*100,0,100))+'<span>%</span>';$('time').textContent=formatTime(elapsed);drawMap();$('race-progress').style.width=clamp(player.distance/length*100,0,100)+'%';}
 function syncGazeOptions(){for(const id of ['gaze-follow','pause-gaze-follow'])$(id).checked=gazeFollow;}
 for(const id of ['gaze-follow','pause-gaze-follow'])$(id).onchange=e=>{gazeFollow=e.target.checked;syncGazeOptions();if(!gazeFollow)gazeState.lookDegrees=0;updateCamera(true);};
 syncGazeOptions();
 function syncBodyOptions(){for(const id of ['body-motion','pause-body-motion'])$(id).checked=bodyMotion;}
 for(const id of ['body-motion','pause-body-motion'])$(id).onchange=e=>{bodyMotion=e.target.checked;syncBodyOptions();if(physics){physics.presentationEnabled=bodyMotion;physics.entries.forEach(entry=>physics.sync(entry,false));syncVisuals();}updateCamera(true);};
 syncBodyOptions();
 $('start').onclick=()=>{save.assist=$('assist').checked;save.auto=$('auto-throttle').checked;save.car=selected;save.view=view;resetRace();};
 document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{selected=b.dataset.car;save.car=selected;refreshPreview();syncOptions();persist();$('shop-status').textContent='차량마다 다른 꾸미기를 저장할 수 있어요.';});
 $('enter-garage').onclick=()=>{atWelcome=false;$('welcome').hidden=true;$('menu').hidden=false;syncOptions();};
 $('title-back').onclick=()=>{atWelcome=true;$('menu').hidden=true;$('welcome').hidden=false;};
 $('rotate-left').onclick=()=>{previewAngle-=Math.PI/4;preview.rotation.y=previewAngle;};$('rotate-right').onclick=()=>{previewAngle+=Math.PI/4;preview.rotation.y=previewAngle;};
 $('assist').onchange=e=>{save.assist=e.target.checked;persist();};$('auto-throttle').onchange=e=>{save.auto=e.target.checked;persist();};$('view-select').onchange=e=>{view=e.target.value;save.view=view;persist();};$('camera').onclick=switchView;$('pause').onclick=setPause;$('resume').onclick=resume;
 for(const id of ['restart','again'])$(id).onclick=resetRace;for(const id of ['back-menu','result-menu'])$(id).onclick=toMenu;
 $('rescue').onclick=()=>{if(mode==='race'){const recovered=physics.recover(player);clearInput();syncVisuals();updateCamera(true);showToast(recovered?'도로에서 다시 출발해요':'다른 차가 지나가면 다시 눌러요');}};
 steeringControl=installCitySteering({canDrive:()=>['race','countdown'].includes(mode),onChange:clearInput});
 const controlButtons=[...document.querySelectorAll('[data-control]')];
 function paintControls(){for(const b of controlButtons){const on=[...held.values()].includes(b.dataset.control);b.classList.toggle('pressed',on);b.setAttribute('aria-pressed',String(on));}}
 for(const b of controlButtons){
  b.onpointerdown=e=>{if(!['race','countdown'].includes(mode)||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();held.set(e.pointerId,b.dataset.control);pointerZones.set(e.pointerId,b.closest('.steering')?'steering':'pedals');b.setPointerCapture(e.pointerId);paintControls();};
  b.onpointermove=e=>{if(!pointerZones.has(e.pointerId))return;e.preventDefault();const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-control]');const zone=hit?(hit.closest('.steering')?'steering':'pedals'):null;held.set(e.pointerId,zone===pointerZones.get(e.pointerId)?hit.dataset.control:null);paintControls();};
  const release=e=>{held.delete(e.pointerId);pointerZones.delete(e.pointerId);paintControls();};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;b.oncontextmenu=e=>e.preventDefault();
 }
 addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||document.querySelector('dialog[open]'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyX','ShiftLeft','ShiftRight'].includes(e.code)){if(['race','countdown'].includes(mode)){e.preventDefault();keys.add(e.code);}}if(e.repeat)return;if(e.code==='KeyC' && ['race','countdown','paused'].includes(mode))switchView();if(['KeyP','Escape'].includes(e.code)){if(mode==='paused')resume();else setPause();}if(e.code==='KeyR' && mode==='race')$('rescue').click();});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{clearInput();setPause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();setPause();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setPause();fail('화면 연결이 잠시 끊겼어요. 다시 열면 저장한 상금은 유지돼요.');});
 for(const name of ['help','credits']){$(name+'-open').onclick=()=>{const dialog=$(name);dialog.showModal();dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});};document.querySelector('[data-close="'+name+'"]').onclick=()=>$(name).close();}
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('load-status').textContent='이 브라우저에서는 가로로 돌려서 플레이해 주세요.';}};
 addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;clearInput();updateCamera(true);camera.updateProjectionMatrix();});
 refreshTransferredSave=()=>{selected=save.car;view=save.view;toMenu();$('shop-status').textContent='저장 기록을 반영했어요. 옮겨 온 차로 달려 보세요.';};
 syncOptions();$('enter-garage').disabled=false;$('enter-garage').textContent='차고 문 열기 →';$('welcome-status').textContent='준비 완료 · 너만의 레이스를 시작해 봐!';$('start').disabled=false;$('start').textContent='레이스 출발  →';$('load-status').textContent='준비 완료 · 스마트폰은 가로 화면을 추천해요';
 let last=performance.now(),lastDt=1/60,frameCount=0,avgFrame=16,poorFrames=0;
 function frame(now){lastDt=clamp((now-last)/1000,0,.05);last=now;step(lastDt);if(mode!=='menu'){syncVisuals();if(frameCount%3===0)updateHUD();}updateCamera();wheel.rotation.z+=lastDt*.035;capsules.forEach(c=>c.rotation.z=-wheel.rotation.z);if(toastTime>0){toastTime-=lastDt;if(toastTime<=0)$('toast').classList.remove('visible');}renderScene(false,now);frameCount++;
  avgFrame=avgFrame*.98+lastDt*1000*.02;if(mode==='race' && avgFrame>34)poorFrames++;else poorFrames=Math.max(0,poorFrames-1);if(poorFrames>200 && renderer.getPixelRatio()>1){renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);poorFrames=0;}requestAnimationFrame(frame);
 }
 let mirrorProbeObject=null;
 if(new URLSearchParams(location.search).get('qa')==='1')window.__raceQA={snapshot:()=>({recentImpact,mode,input:{...input},touches:held.size+(steeringControl?.active?1:0),steeringControl:steeringControl?.snapshot(),skidCount:skidMesh.count,screen:mode==='menu'?(atWelcome?'welcome':'garage'):mode,loadout:{...save.garage[selected]},owned:[...save.owned],tuning:tuning(save,selected),physicalTuning:physics?.entries[0]?.config,previewMaterials:preview?(()=>{const result=[];preview.traverse(o=>{if(o.isMesh&&o.material.name==='CarSurface')result.push(o.material.color.getHexString());});return result;})():[],customWheels:preview?.getObjectsByProperty('name','dream-wheel-trim').length,car:selected,view,engine:'verified planar tyres + cannon-es collisions',elapsed,coins:save.coins,races:save.races,best:{...save.best},courseBest:structuredClone(save.courseBest||{}),courseId:COURSE_ID,length,player:player?{...player}:null,racers:racers.map(r=>({...r})),camera:camera.position.toArray(),cameraDirection:camera.getWorldDirection(new T.Vector3()).toArray(),cameraFov:camera.fov,cameraAspect:camera.aspect,cameraNear:camera.near,cockpitVisible:cockpit.visible||originalCockpit.group.visible,originalCockpitVisible:originalCockpit.group.visible,proceduralCockpitVisible:cockpit.visible,cockpitStats:selected==='tavaculo'?{...originalCockpit.stats(),steering:{...gazeState,target:gazeTarget,follow:gazeFollow,maxLookDegrees:MAX_LOOK_DEGREES,wheelAmount:clamp(-(player?.steeringAngle||0)/.46,-1,1)}}:cockpitVisual.stats(),mirrorStats:rearView.stats(),frameMs:avgFrame,pixelRatio:renderer.getPixelRatio(),carVisible:visuals[0]?.body.visible,wheelCount:visuals[0]?.wheels.length,caliperCounts:visuals[0]?.calipers.map(c=>c.children.length),wheelVisuals:visuals[0]?.wheels.map(w=>({position:w.position.toArray(),quaternion:w.quaternion.toArray()})),caliperVisuals:visuals[0]?.calipers.map(w=>({position:w.position.toArray(),quaternion:w.quaternion.toArray(),visible:w.visible})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,storageOK}),advance:(seconds,drive={throttle:true})=>{for(let t=0;t<seconds;t+=1/60)step(1/60,drive);syncVisuals();updateCamera(true);updateHUD();renderScene(true);},advanceDriver:seconds=>{for(let t=0;t<seconds;t+=1/60){const guide=physics?.route(physics.entries[0]);step(1/60,guide?{...guide,wheelCommand:true}:{brake:1});}syncVisuals();updateCamera(true);updateHUD();renderScene(true);},mirrorPixels:()=>rearView.pixels(),mirrorProbe:options=>{
   if(!options){if(mirrorProbeObject){scene.remove(mirrorProbeObject);mirrorProbeObject.geometry.dispose();mirrorProbeObject.material.dispose();mirrorProbeObject=null;}renderScene(true);return null;}
   if(!mirrorProbeObject){mirrorProbeObject=new T.Mesh(new T.BoxGeometry(1.6,1.05,1),new T.MeshBasicMaterial({color:'#00ff00',toneMapped:false,fog:false}));mirrorProbeObject.name='qa-rear-view-probe';scene.add(mirrorProbeObject);}
   const forward=new T.Vector3(Math.sin(player.heading),0,Math.cos(player.heading)),right=new T.Vector3(-forward.z,0,forward.x);
   mirrorProbeObject.position.set(player.x,(player.y||0)+1.05,player.z).addScaledVector(forward,(options.behind===false?1:-1)*(options.distance||12)).addScaledVector(right,options.x||0);mirrorProbeObject.rotation.y=player.heading;
   renderScene(true);return{position:mirrorProbeObject.position.toArray(),xMeaning:'driver right positive',behind:options.behind!==false};
  },setWheelInspection:value=>{wheelInspection=!!value;updateCamera(true);},setAssist:value=>{save.assist=value;},track:()=>track,reviewScene:({progress=.34,closing=null,side=false}={})=>{
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
