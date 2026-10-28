import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';
import {dressCar,disposeDress,buildGarage} from '../../garage-visual.mjs';
import {normalizeSave,CATALOG,itemById,transact} from '../../garage-core.mjs';
const $=id=>document.getElementById(id),base=new URL('../../',import.meta.url),stage=document.querySelector('.stage');
// This study keeps every purchase in memory. It never reads or writes browser storage.
let save=normalizeSave({version:1,coins:1000}),car='tavaculo',category='paint',pending=null,model,angle=Math.PI*.78,ready=false;
const names={tavaculo:'Tavaculo',f2002:'클래식 F2002'},models={},renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
const scene=new T.Scene();scene.background=new T.Color('#14232b');const camera=new T.PerspectiveCamera(32,1,.1,150);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;pmrem.dispose();room.dispose();
scene.add(new T.HemisphereLight('#eff8ff','#263330',1.3));const key=new T.DirectionalLight('#fff4dc',1.5);key.position.set(-3,6,-115);scene.add(key);const fill=new T.DirectionalLight('#b3e6ff',.7);fill.position.set(4,3,-106);scene.add(fill);
const garage=buildGarage(scene);garage.userData.sign.visible=false;let rigs;
function draw(){if(!ready)return;renderer.render(scene,camera);}
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;const horizontal=2*Math.atan(Math.tan(T.MathUtils.degToRad(32/2))*camera.aspect),distance=Math.max(6.3,2.8/Math.tan(horizontal/2));camera.position.set(0,1.9,-110-distance);camera.lookAt(0,.9,-110);camera.updateProjectionMatrix();draw();}
new ResizeObserver(resize).observe(stage);
function refreshModel(){if(!ready)return;if(model){scene.remove(model);disposeDress(model);}const loadout={...save.garage[car]};if(pending)loadout[pending.category]=pending.id;model=dressCar(models[car].clone(true),car,loadout,rigs[car]);model.position.set(0,.24,-110);model.rotation.y=angle;scene.add(model);draw();}
function render(){
 const chosen=pending||itemById(save.garage[car][category]),owned=save.owned.includes(chosen.id),equipped=save.garage[car][category]===chosen.id,cost=owned?0:chosen.price;
 $('wallet').textContent=save.coins.toLocaleString()+' C';$('car-name').textContent=names[car];$('state').textContent=pending&&!equipped?'미리 끼워 보는 중':'지금 장착한 모습';
 const loadout={...save.garage[car],...(pending?{[pending.category]:pending.id}:{})};$('look').textContent=itemById(loadout.paint).name+' · '+itemById(loadout.wheels).name;
 document.querySelectorAll('[data-car]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.car===car)));document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
 $('items').innerHTML=CATALOG.filter(i=>i.category===category).map(i=>`<button class="item" data-item="${i.id}" aria-pressed="${i.id===chosen.id}"><span class="swatch ${category==='wheels'?'wheel':''}" style="--color:${i.color||'#a8b5bd'}"></span><strong>${i.name}</strong><small>${save.garage[car][category]===i.id?'✓ 장착 중':save.owned.includes(i.id)?'보유 · 무료 장착':i.price+' C'}</small></button>`).join('');
 $('items').querySelectorAll('button').forEach(b=>b.onclick=()=>{pending=itemById(b.dataset.item);refreshModel();render();$('status').textContent='미리보기예요. 마음에 들면 아래에서 장착하세요.';document.querySelector('.drawer-scroll').scrollTo({top:document.querySelector('.drawer-scroll').scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 $('item-name').textContent=chosen.name;$('description').textContent=chosen.description;$('price').textContent=equipped?'장착 중':owned?'보유한 물건':cost+' C';$('balance').textContent=equipped?'다른 색이나 휠을 골라 보세요.':save.coins>=cost?'장착 후 남는 상금 '+(save.coins-cost).toLocaleString()+' C':(cost-save.coins).toLocaleString()+' C 더 모으면 살 수 있어요.';
 $('apply').disabled=equipped||save.coins<cost;$('apply').textContent=equipped?'장착 중':save.coins<cost?'상금이 부족해요':owned?'무료로 장착':'구매하고 장착';$('restore').disabled=!pending||equipped;
}
$('browse').onclick=()=>document.querySelector('.drawer-scroll').scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
$('restore').onclick=()=>{pending=null;refreshModel();render();$('status').textContent='장착한 모습으로 돌아왔어요. 상금은 그대로예요.';};
$('apply').onclick=()=>{if(!pending)return;const r=transact(save,car,pending.id);if(!r.ok)return;pending=null;refreshModel();render();$('status').textContent=r.item.name+' 장착 완료! 시안 안에서만 적용돼요.';};
document.querySelectorAll('[data-car]').forEach(b=>{b.disabled=true;b.onclick=()=>{car=b.dataset.car;pending=null;refreshModel();render();$('status').textContent='이 차에 장착된 모습이에요.';};});
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;pending=null;refreshModel();render();document.querySelector('.drawer-scroll').scrollTop=0;$('status').textContent='골라 보기만 해도 차에 바로 보여요.';});
function fold(value){pending=null;if(ready){refreshModel();render();}$('status').textContent='장착한 모습을 보고 있어요.';document.body.classList.toggle('folded',value);$('open').textContent=value?'도색·휠 꾸미기':'차 크게 보기';}
$('close').onclick=()=>fold(true);$('open').onclick=()=>fold(!document.body.classList.contains('folded'));
$('reset').onclick=()=>{save=normalizeSave({version:1,coins:1000});pending=null;refreshModel();render();$('status').textContent='시안용 상금과 꾸미기를 처음으로 돌렸어요.';};
for(const [id,a] of [['front',Math.PI],['side',Math.PI/2],['back',0]])$(id).onclick=()=>{angle=a;if(model){model.rotation.y=angle;draw();}};
let pointer=null,lastX=0;$('world').onpointerdown=e=>{pointer=e.pointerId;lastX=e.clientX;$('world').setPointerCapture(pointer);};$('world').onpointermove=e=>{if(e.pointerId!==pointer)return;angle+=(e.clientX-lastX)*.012;lastX=e.clientX;if(model){model.rotation.y=angle;draw();}};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,()=>pointer=null);
async function boot(){rigs=await fetch(new URL('assets/vehicle-rigs.json',base)).then(r=>r.json());const loader=new GLTFLoader();for(const name of ['tavaculo','f2002']){const asset=await loader.loadAsync(new URL('assets/'+name+'-rigged.glb',base).href),ob=asset.scene;ob.updateMatrixWorld(true);const b=new T.Box3().setFromObject(ob),size=b.getSize(new T.Vector3());ob.scale.multiplyScalar((name==='tavaculo'?4.7:5.2)/Math.max(size.x,size.z));ob.updateMatrixWorld(true);b.setFromObject(ob);const center=b.getCenter(new T.Vector3()),group=new T.Group();group.add(ob);ob.position.x-=center.x;ob.position.z-=center.z;ob.position.y-=b.min.y;models[name]=group;}
 ready=true;refreshModel();render();resize();document.querySelectorAll('[data-car]').forEach(b=>b.disabled=false);
 window.__garageStudy={snapshot:()=>({car,category,pending:pending?.id||null,save:structuredClone(save),loadout:{...save.garage[car]},ready,isolated:true}),setCoins:value=>{save.coins=value;render();}};
}
boot().catch(e=>{$('error').hidden=false;$('error').textContent='차량을 불러오지 못했어요. 다시 열어 주세요.';console.error(e);});
