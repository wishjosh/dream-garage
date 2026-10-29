import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {DRACOLoader} from './DRACOLoader.js';
import {REFERENCE,createReferencePaint,loadReferenceAssets,prepareFerrari,addReferenceShadow,referenceGrid} from './ferrari-reference.mjs?v=surface-compare-1';
import {buildGarage} from '../../garage-visual.mjs';
import {createPaintStudio} from '../garage-art/paint-studio.mjs';
import {dressArt} from '../garage-art/art-visual.mjs?v=paint-finish-2';
const $=id=>document.getElementById(id),stage=document.querySelector('.stage');
const renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true});
const reviewPixelRatio=Number(new URLSearchParams(location.search).get('review-dpr'));renderer.setPixelRatio(reviewPixelRatio>=1&&reviewPixelRatio<=1.5?reviewPixelRatio:Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
const scene=new T.Scene();scene.background=new T.Color('#14232b');
const studio=createPaintStudio(renderer);scene.environment=studio.texture;
scene.add(new T.HemisphereLight('#eff8ff','#263330',1.8));
const key=new T.DirectionalLight('#fff4dc',.9);key.position.set(-3,6,-115);scene.add(key);
const fill=new T.DirectionalLight('#b3e6ff',.5);fill.position.set(4,3,-106);scene.add(fill);
const garage=buildGarage(scene);garage.userData.sign.visible=false;garage.traverse(o=>{if(o.isLight)o.intensity*=.15;});
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.52)');gradient.addColorStop(.6,'rgba(0,0,0,.25)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
const shadow=new T.Mesh(new T.PlaneGeometry(2.6,5.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.224,-110);scene.add(shadow);
const camera=new T.PerspectiveCamera(32,1,.1,150),models={},names={tavaculo:'Tavaculo',ferrari:'Ferrari 458 Italia'};
const referenceRotation=Math.atan2(4.25,4.5),palette={red:'#ff0000',green:'#56b818',yellow:'#edbd12'},viewAngles={quarter:Math.PI+referenceRotation,front:Math.PI,side:Math.PI/2,back:0};
let preset=new URLSearchParams(location.search).get('preset')==='garage'?'garage':'official',referenceAssets=null;
const lights=[];scene.traverse(o=>{if(o.isLight)lights.push({light:o,intensity:o.intensity});});
const grid=referenceGrid();grid.position.set(0,.225,-110);scene.add(grid);
function applyEnvironment(){const official=preset!=='previous';scene.environment=official&&referenceAssets?referenceAssets.environment:studio.texture;scene.environmentRotation.y=official?referenceRotation:0;renderer.toneMappingExposure=official?REFERENCE.exposure:.92;scene.background.set(preset==='official'?'#333333':'#14232b');const fogNear=Math.max(10,Math.abs(camera.position.z+110)+3.5);scene.fog=preset==='official'?new T.Fog('#333333',fogNear,fogNear+5):null;garage.visible=preset!=='official';grid.visible=preset==='official';for(const item of lights)item.light.intensity=official?0:item.intensity;shadow.visible=selected==='tavaculo'||!official;models.ferrari?.traverse(o=>{if(o.userData.referenceShadow)o.visible=official;});}
const loadTimings={};
let measuring=false,measureAbort=false;
let lastStageWidth=0,lastStageHeight=0;
let selected='tavaculo',paint='red',mode='reference',surface='corrected',angle=viewAngles.quarter,spin=false,lastTime=0,frame=0,config=null,ferrariError=null;
function draw(){renderer.render(scene,camera);}
function resize(){const {width,height}=stage.getBoundingClientRect();if(width<1||height<1)return;if(measuring&&(width!==lastStageWidth||height!==lastStageHeight))measureAbort=true;lastStageWidth=width;lastStageHeight=height;renderer.setSize(width,height,false);camera.aspect=width/height;const horizontal=2*Math.atan(Math.tan(T.MathUtils.degToRad(16))*camera.aspect),distance=Math.max(6.3,2.8/Math.tan(horizontal/2));camera.position.set(0,1.64,-110-distance);camera.lookAt(0,.74,-110);if(scene.fog){scene.fog.near=Math.max(10,distance+3.5);scene.fog.far=scene.fog.near+5;}camera.updateProjectionMatrix();draw();}
new ResizeObserver(resize).observe(stage);

function normalize(ob,yaw=0,length=4.7){const orient=new T.Group();orient.add(ob);orient.rotation.y=yaw;orient.updateMatrixWorld(true);let box=new T.Box3().setFromObject(orient),size=box.getSize(new T.Vector3());const sourceSize=size.toArray(),scale=length/Math.max(size.x,size.z);orient.scale.setScalar(scale);orient.updateMatrixWorld(true);box.setFromObject(orient);const center=box.getCenter(new T.Vector3());orient.position.set(-center.x,-box.min.y,-center.z);const group=new T.Group();group.add(orient);group.position.set(0,.24,-110);group.userData.sourceSize=sourceSize;group.userData.displayDimensions=sourceSize.map(v=>v*scale);group.userData.displayLength=length;group.userData.normalization=scale;group.userData.paintBindings=[];return group;}
function bindPaint(root,materialNames){const materials=new Map();root.traverse(o=>{if(!o.isMesh)return;const convert=source=>{if(!materialNames.includes(source.name))return source;if(materials.has(source))return materials.get(source).source;const cloned=source.clone();const common=new T.MeshPhysicalMaterial({name:'comparison-common-paint',color:palette.red,metalness:.08,roughness:.31,clearcoat:.35,clearcoatRoughness:.13,envMapIntensity:.7,side:source.side});materials.set(source,{source:cloned,common,reference:createReferencePaint()});return cloned;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});root.userData.paintBindings=[...materials.values()];root.traverse(o=>{if(!o.isMesh)return;o.userData.paintSlots=(Array.isArray(o.material)?o.material:[o.material]).map(m=>root.userData.paintBindings.find(b=>b.source===m)||null);});}
function applyPaint(root){if(!root)return;for(const binding of root.userData.paintBindings){const color=preset==='previous'&&paint==='red'?'#ba081b':palette[paint];binding.common.color.set(color);binding.source.color.set(color);binding.reference.color.set(color);}root.traverse(o=>{if(!o.isMesh||!o.userData.paintSlots?.some(Boolean))return;const old=Array.isArray(o.material)?o.material:[o.material],next=old.map((m,i)=>{const b=o.userData.paintSlots[i];return b?b[mode]:m;});o.material=Array.isArray(o.material)?next:next[0];});}
// Keep both normal attributes on the same geometry: no positions, indices or wheels change.
let surfaceBindings=[];
function captureBodySurfaces(root){const entries=[];root.traverse(mesh=>{if(mesh.isMesh&&(Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(m=>m.name==='CarSurface'))entries.push({mesh,originalGeometry:mesh.geometry,original:mesh.geometry.getAttribute('normal').clone()});});return entries;}
function finishBodySurfaces(entries){return entries.map(entry=>{const {mesh,originalGeometry,original}=entry,corrected=mesh.geometry.getAttribute('normal');const equal=(a,b)=>a?.array.length===b?.array.length&&a.array.every((v,i)=>v===b.array[i]);return{mesh,original,corrected,changedVertices:mesh.geometry.userData.studyNormalCorrections||0,positionsUnchanged:equal(originalGeometry.getAttribute('position'),mesh.geometry.getAttribute('position')),indicesUnchanged:originalGeometry.index===null&&mesh.geometry.index===null||equal(originalGeometry.index,mesh.geometry.index)};});}
function applySurface(){for(const b of surfaceBindings){const attribute=surface==='original'?b.original:b.corrected;if(b.mesh.geometry.getAttribute('normal')!==attribute)b.mesh.geometry.setAttribute('normal',attribute);}}
function setSurface(value){if(measuring||selected!=='tavaculo'||!['corrected','original'].includes(value))return;surface=value;update();}
function update(){
 applySurface();
 applyEnvironment();for(const [name,ob]of Object.entries(models)){ob.visible=name===selected;ob.rotation.y=angle;applyPaint(ob);}
 for(const attribute of ['model','paint','preset','mode','surface'])document.querySelectorAll('[data-'+attribute+']').forEach(b=>{if(attribute==='model')b.disabled=measuring||!models[b.dataset.model];b.setAttribute('aria-pressed',String(b.dataset[attribute]===({model:selected,paint,preset,mode,surface})[attribute]));});
 document.querySelectorAll('[data-surface]').forEach(b=>{b.disabled=measuring||selected!=='tavaculo';});
 $('surface-note').textContent=selected==='tavaculo'?'차체의 반사 방향만 전환합니다. 차 모양·휠·도장·조명·카메라는 그대로입니다.':'페라리는 원본 표면을 유지합니다. 표면 보정 비교는 Tavaculo에서 사용할 수 있습니다.';
 $('car-name').textContent=names[selected];$('state').textContent=models[selected]?({official:'공식 반사 · 중립 배경',garage:'공식 반사 · 차고 배경',previous:'이전 차고 표현'})[preset]:'차량 준비 중…';
 $('look').textContent=({red:'레드',green:'그린',yellow:'옐로'})[paint]+' · '+({reference:'페라리와 같은 도장',source:'이전 차량별 도장',common:'이전 공통 도장'})[mode]+(selected==='tavaculo'?' · 보정 '+(surface==='corrected'?'켬':'끔'):'');
 $('size-note').textContent='Ferrari 4.527m · Tavaculo 4.459m(Huracán 전장 기준). 같은 카메라에서 전장을 비교합니다. 폭·높이는 원본 비율을 유지합니다.';
 document.querySelector('[data-paint=red] i').style.background=preset==='previous'?'#ba081b':'#ff0000';
 $('mode-note').textContent=mode==='reference'?'두 차체에 같은 페라리 도장 재질을 적용했습니다. Tavaculo의 유리·트림·휠은 기존 마감입니다.':mode==='source'?'게시 당시 차량별 도장입니다. Tavaculo는 이전 도장, 페라리는 공식 예제 도장을 사용합니다.':'이전 시안의 공통 도장입니다. 표면 보정 상태는 아래 선택을 따릅니다.';
 draw();document.querySelector('#review-state').textContent=JSON.stringify(snapshot());
}
function setPreset(value){if(measuring||!['official','garage','previous'].includes(value))return;preset=value;mode=value==='previous'?'common':'reference';paint='red';update();resize();}
function setModel(name){if(measuring||!models[name])return false;selected=name;update();return true;}
function setView(name){if(measuring||!(name in viewAngles))return;angle=viewAngles[name];update();}
function setPaint(value){if(measuring||!(value in palette))return;paint=value;update();}
function setMode(value){if(measuring||!['source','common','reference'].includes(value))return;mode=value;update();}
function loop(time){if(!spin){frame=0;return;}if(lastTime)angle+=Math.min((time-lastTime)/1000,.1)*.21;lastTime=time;for(const ob of Object.values(models))ob.rotation.y=angle;draw();frame=requestAnimationFrame(loop);}
function setSpin(value){spin=value;$('spin').setAttribute('aria-pressed',String(spin));$('spin').textContent=spin?'회전 멈춤':'자동 회전';if(spin&&!frame){lastTime=0;frame=requestAnimationFrame(loop);}else if(!spin&&frame){cancelAnimationFrame(frame);frame=0;}update();}
for(const [attribute,action]of [['model',setModel],['view',setView],['paint',setPaint],['mode',setMode],['preset',setPreset],['surface',setSurface]])document.querySelectorAll('[data-'+attribute+']').forEach(b=>b.onclick=()=>action(b.dataset[attribute]));
$('spin').onclick=()=>setSpin(!spin);function fold(value){document.body.classList.toggle('folded',value);$('open').textContent=value?'비교 설정':'설정 접기';}$('close').onclick=()=>fold(true);$('open').onclick=()=>fold(!document.body.classList.contains('folded'));
$('reset').onclick=()=>{setSpin(false);angle=viewAngles.quarter;paint='red';mode=preset==='previous'?'common':'reference';surface='corrected';update();};
let pointer=null,lastX=0;$('world').onpointerdown=e=>{if(measuring)return;setSpin(false);pointer=e.pointerId;lastX=e.clientX;$('world').setPointerCapture(pointer);};$('world').onpointermove=e=>{if(measuring||pointer!==e.pointerId)return;angle+=(e.clientX-lastX)*.012;lastX=e.clientX;update();};for(const type of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(type,()=>{pointer=null;});document.addEventListener('visibilitychange',()=>{if(document.hidden){setSpin(false);measureAbort=true;}});
function vehicleBounds(root){root.updateWorldMatrix(true,true);const bounds=new T.Box3();root.traverse(o=>{if(o.isMesh&&!o.userData.referenceShadow)bounds.union(new T.Box3().setFromObject(o));});return bounds;}
function snapshot(){const ob=models[selected];let meshes=0,triangles=0;const materials=new Set(),geometries=new Set();ob?.traverse(o=>{if(!o.isMesh||o.userData.referenceShadow)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;geometries.add(o.geometry.uuid);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m.uuid));});return{ready:!!ob,available:Object.keys(models),selected,paint,mode,surface:selected==='tavaculo'?surface:'original',surfaceAudit:surfaceBindings.map(b=>({mesh:b.mesh.name,changedVertices:b.changedVertices,positionsUnchanged:b.positionsUnchanged,indicesUnchanged:b.indicesUnchanged,activeNormal: b.mesh.geometry.getAttribute('normal')===b.original?'original':'corrected'})),preset,angle,spin,isolated:true,measuring,loadTimings:{...loadTimings},programs:renderer.info.programs.length,pixelRatio:renderer.getPixelRatio(),ferrariError,camera:camera.position.toArray(),fov:camera.fov,environment:preset==='previous'?'paint-finish-2/reflection-cards':'venice_sunset_1k.hdr',environmentRotation:scene.environmentRotation.y,activeLights:lights.filter(x=>x.light.intensity>0).length,sizeBasis: selected==='ferrari'?'Ferrari 458 official overall length':'Lamborghini Huracan LP 610-4 overall length used for fictional Tavaculo',displayLength:ob?.userData.displayLength,displayDimensions:ob?.userData.displayDimensions,exposure:renderer.toneMappingExposure,sourceSize:ob?.userData.sourceSize,bodyMaterial:(()=>{const m=ob?.userData.paintBindings[0]?.[mode];return m?{color:m.color.getHexString(),metalness:m.metalness,roughness:m.roughness,clearcoat:m.clearcoat,clearcoatRoughness:m.clearcoatRoughness,envMapIntensity:m.envMapIntensity,side:m.side,flatShading:m.flatShading}:null;})(),scale:ob?.userData.normalization,box:ob?vehicleBounds(ob).getSize(new T.Vector3()).toArray():null,paintBindings:ob?.userData.paintBindings.length||0,paintState:ob?.userData.paintBindings.map(b=>({name:b.source.name,color:b[mode].color.getHexString()})),meshes,triangles,materials:materials.size,geometries:geometries.size,drawCalls:renderer.info.render.calls,sceneTriangles:renderer.info.render.triangles,memory:{...renderer.info.memory}};}
const percentile=(values,p)=>{const sorted=values.toSorted((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;};
async function benchmark(frames=180){
 setSpin(false);const samples=[],cpu=[];let previous=0;
 for(let i=0;i<frames+25;i++){
  const now=await new Promise(requestAnimationFrame);if(measureAbort||document.hidden)throw Error('measurement-cancelled');
  const dt=previous?now-previous:0;angle+=.0035;for(const ob of Object.values(models))ob.rotation.y=angle;
  const start=performance.now();draw();const submitted=performance.now()-start;
  if(i>=25){samples.push(dt);cpu.push(submitted);}previous=now;
 }
 const median=percentile(samples,.5);return{...snapshot(),frames:samples.length,frameIntervalMedianMs:median,frameIntervalP95Ms:percentile(samples,.95),renderSubmitMedianMs:percentile(cpu,.5),slowFramesOver33ms:samples.filter(x=>x>33.4).length,estimatedFps:1000/median,method:'Identical 205-frame angular path; 25 warm-up plus 180 sampled frames; rAF cadence and render submission, not GPU-only timing or race performance'};
}
let lastMeasurement=null;
async function measureBoth(){
 if(measuring){measureAbort=true;return;}
 if(!models.ferrari){$('perf-results').textContent='두 차량의 준비가 끝나면 측정할 수 있어요.';return;}
 const state={selected,angle,spin};setSpin(false);measuring=true;measureAbort=false;
 for(const b of document.querySelectorAll('button'))b.disabled=b.id!=='measure';$('measure').textContent='측정 중단';$('measure').setAttribute('aria-busy','true');
 const results=[];
 try{
  for(const name of ['tavaculo','ferrari']){selected=name;angle=state.angle;update();$('perf-results').textContent=names[name]+' 회전 측정 중…';results.push(await benchmark());}
  lastMeasurement={results,userAgent:navigator.userAgent,devicePixelRatio,renderPixelRatio:renderer.getPixelRatio(),stage:{width:stage.clientWidth,height:stage.clientHeight},mode,paint};document.querySelector('#measurement-state').textContent=JSON.stringify(lastMeasurement);
  $('perf-results').textContent=results.map(r=>names[r.selected]+': '+Math.round(r.estimatedFps)+' fps · 33ms 초과 '+r.slowFramesOver33ms+'/'+r.frames).join('\n');
 }catch(error){if(error.message==='measurement-cancelled')$('perf-results').textContent='측정을 중단했어요. 화면을 켜 둔 채 다시 측정할 수 있어요.';else throw error;}
 finally{selected=state.selected;angle=state.angle;measuring=false;for(const b of document.querySelectorAll('button'))b.disabled=false;$('measure').textContent='이 기기에서 비교 측정';$('measure').removeAttribute('aria-busy');update();if(state.spin)setSpin(true);}
}
$('measure').onclick=()=>measureBoth().catch(error=>{console.error(error);$('perf-results').textContent='측정을 완료하지 못했어요.';});
window.__vehicleCompare={snapshot,setModel,setPaint,setMode,setSurface,setView,setSpin,benchmark,measurement:()=>lastMeasurement};
async function boot(){
 const decoder=new DRACOLoader();decoder.setDecoderPath(new URL('./draco/',import.meta.url).href);decoder.setDecoderConfig({type:'wasm'});const loader=new GLTFLoader();loader.setDRACOLoader(decoder);const base=new URL('../../',import.meta.url);config=await fetch('./config.json').then(r=>r.json());const rigs=await fetch(new URL('assets/vehicle-rigs.json',base)).then(r=>r.json());referenceAssets=await loadReferenceAssets();applyEnvironment();
 const tavStart=performance.now();const tav=await loader.loadAsync(new URL('assets/tavaculo-rigged.glb',base).href);loadTimings.tavaculo=performance.now()-tavStart;const originalSurfaces=captureBodySurfaces(tav.scene);let group=normalize(tav.scene,0,config.tavaculo.displayLength);group=dressArt(group,'tavaculo',{paint:'paint-red',wheels:'wheels-five'},rigs.tavaculo,'refined');surfaceBindings=finishBodySurfaces(originalSurfaces);bindPaint(group,['study-clearcoat']);models.tavaculo=group;scene.add(group);update();resize();$('status').textContent='기존 차량 준비 완료. 페라리를 불러오고 있습니다.';
 try{const ferrariStart=performance.now();const asset=await loader.loadAsync(new URL(config.ferrari.url,import.meta.url).href),ob=normalize(prepareFerrari(asset.scene),config.ferrari.rotationY||0,config.ferrari.displayLength);addReferenceShadow(asset.scene.children[0],referenceAssets.shadow);bindPaint(ob,config.ferrari.paintMaterials);if(!ob.userData.paintBindings.length)throw Error('Ferrari paint material mapping required');loadTimings.ferrari=performance.now()-ferrariStart;models.ferrari=ob;scene.add(ob);$('measure').disabled=false;$('status').textContent='두 차량 준비 완료. 위의 차량 버튼으로 같은 구도를 비교해 보세요.';selected='tavaculo';update();}
 catch(error){ferrariError=error.message;$('status').textContent='페라리를 불러오지 못했습니다. 다시 열어 주세요.';console.error('Ferrari loading failed:',error.message);}
 decoder.dispose();const stats=document.createDocumentFragment();for(const [name,ob]of Object.entries(models)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=names[name];selected=name;update();const value=snapshot();dd.textContent=value.displayLength.toFixed(3)+'m 전장 기준 · '+Math.round(value.triangles).toLocaleString()+'삼각형';stats.append(dt,dd);}selected='tavaculo';$('asset-stats').replaceChildren(stats);update();resize();
}
boot().catch(error=>{$('status').textContent='차량을 불러오지 못했습니다. 새로 열어 주세요.';console.error(error);});
