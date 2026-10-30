import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL('../dist/',import.meta.url),out=new URL('studies/mixed-city/',base);
const read=async path=>(await readFile(new URL(path,base),'utf8')).replaceAll('\r\n','\n');
const put=(name,text)=>writeFile(new URL(name,out),text.replace(/[ \t]+$/gm,''));
const source=await read('studies/ferrari-city/game.mjs');let code=source;
code="import {installPageActivity} from './activity.mjs?v=mixed-city-3';\nimport {bindDragRotation} from '../garage-preview/drag-rotation.mjs?v=garage-preview-2';\n"+code;
function replace(old,value){if(!code.includes(old))throw Error('Missing anchor: '+old.slice(0,90));code=code.replace(old,value);}
replace("from '../../garage-core.mjs?v=city-tour-1'","from './core.mjs?v=mixed-city-3'");
replace("import {loadFerrari,dressCar,disposeDress,buildGarage} from './asset.mjs?v=ferrari-city-2';","import {loadFleet,dressCar,disposeDress,buildGarage,geometryUnchanged,steerExterior} from './asset.mjs?v=mixed-city-3';");
replace("from './cockpit.mjs?v=ferrari-city-2'","from './cockpit.mjs?v=mixed-city-3'");replace("from './measure.mjs?v=ferrari-city-2'","from './measure.mjs?v=mixed-city-3'");
replace("from '../../race-handling.mjs?v=race-safety-1'","from './physics.mjs?v=mixed-city-3'");
replace('const ferrari=await loadFerrari();','const ferrari=await loadFleet();');
replace("addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{clearInput();setPause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();setPause();}});","addEventListener('keyup',e=>keys.delete(e.code));installPageActivity({onRelease:clearInput,onSuspend:setPause});");
replace('let wheelInspection=false;',"let wheelInspection=false,lastPauseReason='';");
replace("function setPause(){if(!['race','countdown'].includes(mode))return;", "function setPause(reason='manual'){if(!['race','countdown'].includes(mode))return;lastPauseReason=typeof reason==='string'?reason:'manual';$('pause-reason').textContent=lastPauseReason==='window-blur'?'다른 창으로 이동해 잠시 멈췄어요.':['document-hidden','page-hidden'].includes(lastPauseReason)?'앱이나 탭을 벗어나 잠시 멈췄어요.':'달리던 자리에서 이어갈 수 있어요.';");

replace('Math.min(devicePixelRatio,1.5)',"new URLSearchParams(location.search).get('qa')==='1'&&new URLSearchParams(location.search).get('review-dpr')==='1.5'?1.5:Math.min(devicePixelRatio,1.5)");
code=code.replaceAll("'f2002'","'porsche'").replaceAll('클래식 F2002','Porsche 911 Turbo S');
replace("const rigs=await fetch('./assets/vehicle-rigs.json').then(r=>{if(!r.ok)throw Error('Missing wheel rig');return r.json();});","const rigs={tavaculo:ferrari.rig,porsche:ferrari.porsche.rig};");
replace("if(name==='tavaculo'){models[name]=ferrari.exterior;rigs[name]=ferrari.rig;}","if(name==='tavaculo')models[name]=ferrari.exterior;\n  else if(name==='porsche')models[name]=ferrari.porsche.exterior;");
replace('const originalCockpit=await originalCockpitPromise;',"const cabins=await originalCockpitPromise;let originalCockpit=cabins[selected];\n function selectCabin(){for(const [kind,cabin] of Object.entries(cabins))if(kind!==selected)cabin.group.visible=false;originalCockpit=cabins[selected];}");
const a=code.indexOf(' const rearView=createRearView'),b=code.indexOf('\n function paintRecovery',a);
code=code.slice(0,a)+` const mirrors=Object.fromEntries(Object.entries(cabins).map(([kind,cabin])=>[kind,{
  rear:createRearView({renderer,scene,camera,cockpit:cabin.group,surface:cabin.mirrorSurface}),
  sides:cabin.sideMirrors.map(m=>({id:m.id,view:createRearView({renderer,scene,camera,cockpit:cabin.group,surface:m.surface,options:{name:kind+'-'+m.id,origin:m.origin,aspect:m.aspect,yaw:m.yaw,width:192,height:96,hz:10,economyWidth:128,economyHeight:64,economyHz:6,fov:36,allowOverlay:false,cullOffscreen:true}})}))
 }]));
 let rearView=mirrors[selected].rear,sideViews=mirrors[selected].sides;
 function renderMirror(force=false,now=performance.now()){
  rearView=mirrors[selected].rear;sideViews=mirrors[selected].sides;
  for(const [kind,m] of Object.entries(mirrors)){const args={player,enabled:kind===selected&&originalCockpit.group.visible&&mode!=='menu'&&!wheelInspection,paused:mode==='paused'||mode==='result',force,now,frameMs:avgFrame,portrait:innerHeight>innerWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,hide:[visuals[0]?.root,cockpit,...Object.values(cabins).map(c=>c.group)]};m.rear.update(args);for(const side of m.sides)side.view.update(args);}
 }
`+code.slice(b);
replace("originalCockpit.group.visible=cabinVisible&&selected==='tavaculo';cockpit.visible=cabinVisible&&selected==='porsche';","originalCockpit.group.visible=cabinVisible;cockpit.visible=false;");
replace('camera.near=.12;originalCockpit.group.visible=false;','selectCabin();camera.near=.12;originalCockpit.group.visible=false;');
replace("cockpit.visible=view==='cockpit'&&selected==='porsche';originalCockpit.group.visible=view==='cockpit'&&selected==='tavaculo';","cockpit.visible=false;originalCockpit.group.visible=view==='cockpit';");
replace("if(view==='cockpit'&&selected==='tavaculo')","if(view==='cockpit')");
const begin=code.indexOf("  }else if(view==='cockpit'){");const end=code.indexOf('\n  }else{\n   camera.up',begin);if(begin<0||end<0)throw Error('Cabin branch anchor');code=code.slice(0,begin)+code.slice(end);
replace("gazeTarget=selected==='tavaculo'&&view==='cockpit'","gazeTarget=view==='cockpit'");
replace("car:i===1?'tavaculo':'porsche'","car:i===1?selected:(selected==='tavaculo'?'porsche':'tavaculo')");
replace('if(r===player)dressCar(body,r.car,save.garage[selected],rigs[r.car]);','dressCar(body,r.car,save.garage[r.car],rigs[r.car]);');
replace('playerTuning:tuning(save,selected)','playerTuning:document.body.dataset.cityMeasuring===\'true\'?null:tuning(save,selected)');
replace('v.body.quaternion.fromArray(r.quaternion||[0,0,0,1]);',"v.body.quaternion.fromArray(r.quaternion||[0,0,0,1]);steerExterior(v.body,r.car,clamp(-(r.steeringAngle||0)/.46,-1,1),ferrari.porsche.template.axis);");
replace("start:profile=>{selected='tavaculo';view=profile;save.view=profile;resetRace();}","start:profile=>{selected=profile.car;view=profile.view;save.view=view;resetRace();}");
replace('drive:()=>physics?',"phase:()=>({mode,car:selected,view,pixelRatio:renderer.getPixelRatio()}),\n  drive:()=>physics?");
replace("description:'페라리 원본 휠의 색상만 변경'","description:'원본 휠의 색상만 변경'");
replace(" $('rotate-left').onclick="," bindDragRotation(document.querySelector('.garage-stage'),delta=>{previewAngle+=delta;preview.rotation.y=previewAngle;},{enabled:()=>mode==='menu'&&!atWelcome&&!document.querySelector('dialog[open]')});\n $('rotate-left').onclick=");
replace('state:()=>({mode,view,elapsed,','state:()=>({mode,car:selected,view,elapsed,previewAngle,lastPauseReason,aiRecoveryCount:physics?.aiRecoveryCount||0,geometryUnchanged:geometryUnchanged(),fleet:racers.map(r=>({id:r.id,car:r.car,speed:r.speed,distance:r.distance})),');
replace("cockpitStats:selected==='tavaculo'?{","cockpitStats:{");replace('}:cockpitVisual.stats(),mirrorStats:','},mirrorStats:');
// Keep main rendering resolution fixed throughout this visual-quality study.
const adaptive="if(poorFrames>200 && renderer.getPixelRatio()>1){renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);poorFrames=0;}";replace(adaptive,'');
replace(',poorFrames=0;', ';');
replace("if(mode==='race' && avgFrame>34)poorFrames++;else poorFrames=Math.max(0,poorFrames-1);",'');
replace('dimensions:ferrari.dimensions,paint:preview?.getObjectByName(\'body\')?.material.color.getHexString()','dimensions:selected===\'porsche\'?ferrari.porsche.dimensions:ferrari.dimensions,paint:itemById(save.garage[selected].paint)?.color');
code=code.replaceAll(".getObjectByName('body').material",".getObjectByName('body')?.material");
if(/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(code))throw Error('Persistence leaked');
await put('game.mjs','// Generated by scripts/build-mixed-city.mjs; source SHA256 '+createHash('sha256').update(source).digest('hex')+'\n'+code.replace(/^\/\/ Generated.*\n/,''));
await put('core.mjs','// Isolated study catalog: both vehicles use the stock road-car physics.\n'+(await read('garage-core.mjs')).replace(/^export const CARS=.*;$/m,"export const CARS=['tavaculo','porsche'];"));
let html=await read('studies/ferrari-city/index.html');
html=html.replace('src="./studies/ferrari-city/game.mjs?v=ferrari-city-2"','src="./studies/mixed-city/game.mjs?v=mixed-city-3"');
html=html.replace('<p>달리던 자리에서 이어갈 수 있어요.</p>','<p id="pause-reason">달리던 자리에서 이어갈 수 있어요.</p>');
html=html.replace('</head>','<link rel="stylesheet" href="./studies/mixed-city/city.css?v=mixed-city-3">\n</head>');
html=html.replaceAll('페라리 도시 주행 시안','페라리·포르쉐 도시 주행 시안').replace('FERRARI · CITY STUDY','FERRARI × PORSCHE · CITY STUDY').replace('<h1>페라리 458<span>도시 주행 시안</span></h1>','<h1>페라리 × 포르쉐<span>함께 달리는 도시</span></h1>');
html=html.replace('외관·운전석·실시간 거울을 함께 확인해요.<br>성능 측정에서는 약 50초 동안 자동으로 달려요.','페라리 2대와 포르쉐 2대가 함께 달려요.<br>두 차의 외관·운전석·거울을 비교해 보세요.');
html=html.replaceAll('약 50초','약 1분 40초').replace('페라리 검토용 차고','두 슈퍼카의 검토용 차고').replaceAll('data-car="f2002"','data-car="porsche"').replaceAll('클래식 F2002','Porsche 911 Turbo S').replace('포뮬러 · 빠른 가속','원본 실내 · 같은 기본 주행 설정');
html=html.replace(/<dialog id="save-transfer"[\s\S]*?<\/dialog>/,'');
html=html.replace('현재 화면 크기로 실제 도시·주행 물리·상대차 3대를 함께 측정합니다. 외관과 운전석을 차례로 자동 주행해요. 운전석에는 룸미러와 화면에 보이는 사이드미러가 켜집니다.','페라리 2대와 포르쉐 2대가 실제 도시·주행 물리와 함께 달립니다. 각 차를 운전하며 외관·운전석을 차례로 측정해요. 운전석에는 룸미러와 화면에 보이는 사이드미러가 켜집니다. 표시 배율은 측정 중 고정됩니다.');
html=html.replace('<div class="city-tools"><button id="city-measure-start">','<label class="city-order" for="city-order">먼저 측정할 차<select id="city-order"><option value="ferrari">페라리부터</option><option value="porsche">포르쉐부터</option></select></label><div class="city-tools"><button id="city-measure-start">');
const cs=html.indexOf('<dialog id="credits"'),ce=html.indexOf('</dialog>',cs)+9;
html=html.slice(0,cs)+`<dialog id="credits" aria-labelledby="credits-title"><h2 id="credits-title">함께 만든 도시</h2><p>Ferrari 458 Italia · vicent091036 / Three.js 공식 예제 자산. Porsche 911 with interior · n.brizitskaya (CC BY 4.0). 바퀴·운전대를 분리한 경량화본을 사용합니다.</p><p><a href="./assets/vehicle-compare/ferrari/NOTICE.txt">페라리·환경 출처</a> · <a href="./assets/vehicle-compare/porsche-911/NOTICE.txt">포르쉐 출처와 변경 내용</a> · <a href="./studies/mixed-city/README.md">시안 설명</a></p><p>도시·자연 · Kenney, 도로 · ambientCG (CC0). Three.js·cannon-es (MIT). 제조사의 공식 게임이 아닙니다. 두 차는 같은 기본 게임 물리를 쓰며 실차별 성능 재현이 아닙니다. 포르쉐 원본 계기는 정지 화면이며 실제 속도·기어는 공통 주행 정보창에 표시합니다.</p><button class="primary" data-close="credits">닫기</button></dialog>`+html.slice(ce);
await put('index.html',html);
console.log('Generated independent mixed city game, core and HTML.');
