import * as T from '../../vendor/three.module.js';
import {createPaintStudio} from './paint-studio.mjs';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';
import {buildGarage} from '../../garage-visual.mjs';
import {dressArt as dressCar,disposeArt as disposeDress} from './art-visual.mjs';
import {normalizeSave,CATALOG,itemById,transact} from './art-core.mjs';
const $=id=>document.getElementById(id),base=new URL('../../',import.meta.url),stage=document.querySelector('.stage');
// This study keeps every purchase in memory. It never reads or writes browser storage.
let save=normalizeSave({version:1,coins:1000}),car='tavaculo',category='paint',pending=null,model,angle=Math.PI*.78,ready=false,finish='refined';
const names={tavaculo:'Tavaculo'},models={},renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.78;
const scene=new T.Scene();scene.background=new T.Color('#14232b');const camera=new T.PerspectiveCamera(32,1,.1,150);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;pmrem.dispose();room.dispose();
scene.add(new T.HemisphereLight('#eff8ff','#263330',1.3));const key=new T.DirectionalLight('#fff4dc',1.5);key.position.set(-3,6,-115);scene.add(key);const fill=new T.DirectionalLight('#b3e6ff',.7);fill.position.set(4,3,-106);scene.add(fill);
const garage=buildGarage(scene);garage.userData.sign.visible=false;
const studio=createPaintStudio(renderer),beforeEnvironment=scene.environment,garageLights=[];
garage.traverse(o=>{if(o.isLight)garageLights.push({light:o,intensity:o.intensity});});
const beforeExposure=renderer.toneMappingExposure;
const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;const contactContext=contactCanvas.getContext('2d'),contactGradient=contactContext.createRadialGradient(64,64,8,64,64,64);contactGradient.addColorStop(0,'rgba(0,0,0,.52)');contactGradient.addColorStop(.6,'rgba(0,0,0,.25)');contactGradient.addColorStop(1,'rgba(0,0,0,0)');contactContext.fillStyle=contactGradient;contactContext.fillRect(0,0,128,128);const contact=new T.Mesh(new T.PlaneGeometry(2.6,5.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(contactCanvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.set(0,.224,-110);scene.add(contact);

function applyFinish(){
 const refined=finish==='refined';contact.visible=refined;scene.environment=refined?studio.texture:beforeEnvironment;
 renderer.toneMappingExposure=refined?.92:beforeExposure;
 for(const {light,intensity} of garageLights)light.intensity=refined?intensity*.15:intensity;
 const hemisphere=scene.children.find(o=>o.isHemisphereLight);hemisphere.intensity=refined?1.8:1.3;
 key.intensity=refined?.9:1.5;fill.intensity=refined?.5:.7;
 document.querySelectorAll('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.finish===finish)));
}let rigs,zoomWheel=false;
function draw(){if(!ready)return;renderer.render(scene,camera);}
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;const horizontal=2*Math.atan(Math.tan(T.MathUtils.degToRad(32/2))*camera.aspect),distance=Math.max(6.3,2.8/Math.tan(horizontal/2));if(zoomWheel){model.rotation.y=0;camera.position.set(-2.25,1.03,-108.9);camera.lookAt(-.88,.6,-108.8);}else{if(model)model.rotation.y=angle;camera.position.set(0,1.9,-110-distance);camera.lookAt(0,.9,-110);}camera.updateProjectionMatrix();draw();}
new ResizeObserver(resize).observe(stage);
function refreshModel(){if(!ready)return;if(model){scene.remove(model);disposeDress(model);}const loadout={...save.garage[car]};if(pending)loadout[pending.category]=pending.id;model=dressCar(models[car].clone(true),car,loadout,rigs[car],finish);model.position.set(0,.24,-110);model.rotation.y=zoomWheel?0:angle;scene.add(model);draw();}
function wheelThumb(item){if(!item.kind)return '<span class="swatch wheel" style="--color:#a8b5bd"></span>';const count=item.kind==='fifteen'?15:5;let lines='';for(let i=0;i<count;i++){const a=i*360/count;if(item.kind==='split')lines+=`<path d="M32 28L32 19M32 19L26 7M32 19L38 7" transform="rotate(${a} 32 32)"/>`;else lines+=`<path d="M32 27L${item.kind==='five'?32:35} 7" transform="rotate(${a} 32 32)"/>`;}return `<svg class="wheel-thumb" viewBox="0 0 64 64" role="img" aria-label="${item.name}"><circle cx="32" cy="32" r="29" fill="#151b22" stroke="#a3acb5" stroke-width="3"/><g stroke="${item.color}" stroke-width="${item.kind==='five'?7:3}" fill="none">${lines}</g><circle cx="32" cy="32" r="6" fill="${item.color}"/></svg>`;}
function render(){
 const chosen=pending||itemById(save.garage[car][category]),owned=save.owned.includes(chosen.id),equipped=save.garage[car][category]===chosen.id,cost=owned?0:chosen.price;
 document.querySelectorAll('[data-preset]').forEach(b=>{const pair={red:['paint-red','wheels-five'],green:['paint-green','wheels-split'],yellow:['paint-yellow','wheels-fifteen']}[b.dataset.preset];b.setAttribute('aria-pressed',String(!pending&&save.garage.tavaculo.paint===pair[0]&&save.garage.tavaculo.wheels===pair[1]));});$('wallet').textContent='자유 조합';$('car-name').textContent=names[car];$('state').textContent=pending&&!equipped?'미리 끼워 보는 중':'지금 장착한 모습';
 const loadout={...save.garage[car],...(pending?{[pending.category]:pending.id}:{})};$('look').textContent=itemById(loadout.paint).name+' · '+itemById(loadout.wheels).name;
 document.querySelectorAll('[data-car]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.car===car)));document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
 $('items').innerHTML=CATALOG.filter(i=>i.category===category).map(i=>`<button class="item" data-item="${i.id}" aria-pressed="${i.id===chosen.id}">${category==='wheels'?wheelThumb(i):`<span class="swatch" style="--color:${i.color||'#a8b5bd'}"></span>`}<strong>${i.name}</strong><small>${save.garage[car][category]===i.id?'✓ 장착 중':save.owned.includes(i.id)?'비교 후보':i.price+' C'}</small></button>`).join('');
 $('items').querySelectorAll('button').forEach(b=>b.onclick=()=>{pending=itemById(b.dataset.item);refreshModel();render();$('status').textContent='미리보기예요. 차 전체와 휠 확대를 번갈아 보세요.';document.querySelector('.drawer-scroll').scrollTo({top:document.querySelector('.drawer-scroll').scrollTop+document.querySelector('.detail').getBoundingClientRect().bottom-document.querySelector('.drawer-scroll').getBoundingClientRect().bottom,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 $('item-name').textContent=chosen.name;$('description').textContent=chosen.description;$('price').textContent=equipped?'선택한 조합':'비교 후보';$('balance').textContent='실차에서 영감을 받은 게임용 디자인 · 정확한 복제품은 아니에요.';
 $('apply').disabled=equipped||save.coins<cost;$('apply').textContent=equipped?'현재 선택':save.coins<cost?'상금이 부족해요':owned?'이 모습으로 선택':'이 모습으로 선택';$('restore').disabled=!pending||equipped;
}
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const pair={red:['paint-red','wheels-five'],green:['paint-green','wheels-split'],yellow:['paint-yellow','wheels-fifteen']}[b.dataset.preset];save.garage.tavaculo={paint:pair[0],wheels:pair[1]};pending=null;refreshModel();render();$('status').textContent='같은 조명과 구도에서 비교해 보세요.';});
$('wheel-closeup').onclick=()=>{zoomWheel=!zoomWheel;$('wheel-closeup').textContent=zoomWheel?'차 전체':'휠 확대';$('wheel-closeup').setAttribute('aria-pressed',String(zoomWheel));resize();};
document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{finish=b.dataset.finish;applyFinish();refreshModel();render();$('status').textContent=finish==='refined'?'보정한 유리·도장·조명이에요. 같은 구도로 비교해 보세요.':'이전 표현이에요. 색과 휠·차량 구도는 같아요.';});
$('browse').onclick=()=>document.querySelector('.drawer-scroll').scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
$('restore').onclick=()=>{pending=null;refreshModel();render();$('status').textContent='선택해 둔 조합으로 돌아왔어요.';};
$('apply').onclick=()=>{if(!pending)return;const r=transact(save,car,pending.id);if(!r.ok)return;pending=null;refreshModel();render();$('status').textContent=r.item.name+' 조합을 선택했어요.';};
document.querySelectorAll('[data-car]').forEach(b=>{b.disabled=true;b.onclick=()=>{car=b.dataset.car;pending=null;refreshModel();render();$('status').textContent='이 차에 장착된 모습이에요.';};});
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;pending=null;refreshModel();render();document.querySelector('.drawer-scroll').scrollTop=0;$('status').textContent='골라 보기만 해도 차에 바로 보여요.';});
function fold(value){pending=null;if(ready){refreshModel();render();}$('status').textContent='장착한 모습을 보고 있어요.';document.body.classList.toggle('folded',value);$('open').textContent=value?'도색·휠 꾸미기':'차 크게 보기';}
$('close').onclick=()=>fold(true);$('open').onclick=()=>fold(!document.body.classList.contains('folded'));
$('reset').onclick=()=>{save=normalizeSave({version:1,coins:1000});pending=null;refreshModel();render();$('status').textContent='첫 비교 조합으로 돌아왔어요.';};
for(const [id,a] of [['front',Math.PI],['side',Math.PI/2],['back',0]])$(id).onclick=()=>{angle=a;zoomWheel=false;$('wheel-closeup').textContent='휠 확대';$('wheel-closeup').setAttribute('aria-pressed','false');resize();};
let pointer=null,lastX=0;$('world').onpointerdown=e=>{if(zoomWheel)return;pointer=e.pointerId;lastX=e.clientX;$('world').setPointerCapture(pointer);};$('world').onpointermove=e=>{if(e.pointerId!==pointer)return;angle+=(e.clientX-lastX)*.012;lastX=e.clientX;if(model){model.rotation.y=angle;draw();}};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,()=>pointer=null);
function reviewStats(){
 function geometryHash(root,filter){let hash=2166136261,count=0;root?.traverse(o=>{if(!o.isMesh||!filter(o))return;const a=o.geometry.attributes.position?.array;if(!a)return;count++;for(const v of a)hash=Math.imul(hash^Math.round(v*1e6),16777619);});return{hash:(hash>>>0).toString(16),count};}
 const isWheel=o=>{let p=o;while(p){if(p.name==='study-replacement-wheel')return true;p=p.parent;}return false;};
 let corrected=0;model?.traverse(o=>{corrected+=o.geometry?.userData.studyNormalCorrections||0;});
 const sourceGlass=[];models.tavaculo?.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='Glass')sourceGlass.push(m.color.getHexString());});
 return{body:geometryHash(model,o=>!isWheel(o)),wheel:geometryHash(model,isWheel),correctedNormals:corrected,sourceGlass,memory:{...renderer.info.memory},camera:camera.position.toArray(),fov:camera.fov};
}
async function boot(){rigs=await fetch(new URL('assets/vehicle-rigs.json',base)).then(r=>r.json());const loader=new GLTFLoader();for(const name of ['tavaculo']){const asset=await loader.loadAsync(new URL('assets/'+name+'-rigged.glb',base).href),ob=asset.scene;ob.updateMatrixWorld(true);const b=new T.Box3().setFromObject(ob),size=b.getSize(new T.Vector3());ob.scale.multiplyScalar((name==='tavaculo'?4.7:5.2)/Math.max(size.x,size.z));ob.updateMatrixWorld(true);b.setFromObject(ob);const center=b.getCenter(new T.Vector3()),group=new T.Group();group.add(ob);ob.position.x-=center.x;ob.position.z-=center.z;ob.position.y-=b.min.y;models[name]=group;}
 ready=true;applyFinish();refreshModel();render();resize();document.querySelectorAll('[data-car]').forEach(b=>b.disabled=false);
 window.__garageStudy={snapshot:()=>({car,category,finish,reviewStats:reviewStats(),renderFinish:{environment:finish==='refined'?'reflection-cards':'room',exposure:renderer.toneMappingExposure,garageLights:garageLights.map(o=>o.light.intensity)},pending:pending?.id||null,zoomWheel,replacementWheels:model?.getObjectsByProperty('name','study-replacement-wheel').length||0,paintMaterials:(()=>{const a=[];model?.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='study-clearcoat')a.push({color:m.color.getHexString(),clearcoat:m.clearcoat,roughness:m.roughness,metalness:m.metalness});}});return a;})(),surfaceMaterials:(()=>{const a=[];model?.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(['Glass','Doorstep','study-glass','study-trim'].includes(m.name))a.push({name:m.name,color:m.color.getHexString(),roughness:m.roughness});});return a;})(),save:structuredClone(save),loadout:{...save.garage[car]},ready,isolated:true}),setCoins:value=>{save.coins=value;render();}};
}
boot().catch(e=>{$('error').hidden=false;$('error').textContent='차량을 불러오지 못했어요. 다시 열어 주세요.';console.error(e);});
