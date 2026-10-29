import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base=new URL('../dist/',import.meta.url),out=new URL('studies/ferrari-city/',base);
// The adopted main game now uses Ferrari too. Keep the original isolated study reproducible.
const SOURCE_COMMIT='b7d00d266c6f92a773b40cd25a70ee9baca0987b';
const read=async name=>execFileSync('git',['show',SOURCE_COMMIT+':dist/'+name],{cwd:new URL('../',import.meta.url),encoding:'utf8',maxBuffer:4*1024*1024});
const put=async(name,text)=>writeFile(new URL(name,out),text.replaceAll('\r\n','\n').replace(/[ \t]+$/gm,''));
const original=await read('game.mjs');let code=original.replaceAll('\r\n','\n');
function replace(old,value){if(!code.includes(old))throw Error('Source integration anchor missing: '+old.slice(0,90));code=code.replace(old,value);}
code=code.replace(/from '\.\//g,"from '../../");
replace("import {installSaveTransfer} from '../../save-transfer-ui.mjs?v=city-tour-1';",'');
replace("import {SAVE_KEY} from '../../save-transfer.mjs?v=city-tour-1';",'');
replace("import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';",'');
replace("import {createOriginalCockpit} from '../../original-cockpit.mjs?v=race-hud-1';","import {createOriginalCockpit} from './cockpit.mjs?v=ferrari-city-2';");
replace("import {dressCar,disposeDress,buildGarage} from '../../garage-visual.mjs?v=design-1';","import {loadFerrari,dressCar,disposeDress,buildGarage} from './asset.mjs?v=ferrari-city-2';\nimport {installStudy} from './measure.mjs?v=ferrari-city-2';");
replace("const SAVE=SAVE_KEY;\nlet save=normalizeSave(null),storageOK=true;\ntry{save=normalizeSave(JSON.parse(localStorage.getItem(SAVE)||'null'));}catch{storageOK=false;}\nfunction persist(){try{localStorage.setItem(SAVE,JSON.stringify(save));}catch{storageOK=false;}}",`// Memory only: no access to any browser persistence or original save key.
let save=normalizeSave({version:1,coins:5000,owned:CATALOG.map(i=>i.id),car:'tavaculo',view:'chase'}),storageOK=true;
function persist(){} // Session choices live only in the save object above.`);
replace("installSaveTransfer({getSave:()=>save,onSaveChanged:next=>{save=next;storageOK=true;refreshTransferredSave?.();}});",'');
replace('renderer.toneMappingExposure=.97','renderer.toneMappingExposure=.85');
replace("const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;pmrem.dispose();room.dispose();",'const ferrari=await loadFerrari();scene.environment=ferrari.assets.environment;');
replace("scene.environmentIntensity=.65;scene.add(new T.HemisphereLight('#bbd7ed','#182736',1.3));","scene.environmentIntensity=1;");
replace("const moon=new T.DirectionalLight('#a7cfff',1.5);moon.position.set(-35,70,-30);scene.add(moon);",'');
replace("const warm=new T.DirectionalLight('#ffd0ad',.7);warm.position.set(50,20,60);scene.add(warm);",'');
const assetLine=code.split('\n').find(l=>l.includes('await Promise.all(items.map'));
replace(assetLine,` await Promise.all(items.map(async name=>{
  if(name==='tavaculo'){models[name]=ferrari.exterior;rigs[name]=ferrari.rig;}
  else{const vehicle=name==='f2002';const asset=await gltf.loadAsync('./assets/'+name+(vehicle?'-rigged':'')+'.glb');models[name]=normalize(asset.scene,vehicle?5.2:null);}
  loaded++;$('load-status').textContent='차량과 도시 준비 '+Math.round(loaded/items.length*100)+'%';
 }));`);
replace('const garage=buildGarage(scene);','const garage=buildGarage(scene);garage.traverse(o=>{if(o.isLight)o.intensity=0;});');
replace("?'Tavaculo':'클래식 F2002'","?'Ferrari 458':'클래식 F2002'");
replace("'준비 완료 · 너만의 레이스를 시작해 봐!'","'준비 완료 · 기존 게임 저장과 분리된 시안'");
replace("'화면 연결이 잠시 끊겼어요. 다시 열면 저장한 상금은 유지돼요.'","'화면 연결이 잠시 끊겼어요. 다시 열면 시안이 초기화돼요. 기존 게임 저장에는 영향이 없어요.'");
replace("'첫 번째 완주가 꿈의 시작! 경주에서 상금을 모아 봐요.'","'검토용 꾸미기는 모두 열려 있어요. 새로 열면 초기화돼요.'");
replace("'차량마다 다른 꾸미기를 저장할 수 있어요.'","'이 창에서만 적용돼요. 기존 게임 저장에는 영향이 없어요.'");
code=code.replaceAll("if(!window.__cockpitReviewStorageIsolated)throw Error('Local isolated review only');",'');
// Reporting stays separate from the actual frame loop and cannot advance time.
const install=` const cityStudy=installStudy({
  start:profile=>{selected='tavaculo';view=profile;save.view=profile;resetRace();},pause:setPause,look:value=>originalCockpit.setLook(value),
  drive:()=>physics?{...physics.route(physics.entries[0]),wheelCommand:true}:null,
  state:()=>({mode,view,elapsed,viewport:{width:innerWidth,height:innerHeight},pixelRatio:renderer.getPixelRatio(),cameraFov:camera.fov,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,racers:racers.length,speed:player?.speed||0,heading:player?.heading||0,wheels:visuals[0]?.wheels.map(w=>({name:w.name,position:w.position.toArray(),quaternion:w.quaternion.toArray()})),mirrorStats:rearView.stats(),sideMirrorStats:sideViews.map(s=>({id:s.id,...s.view.stats()})),cockpit:view==='cockpit'?originalCockpit.stats():null,exterior:{dimensions:ferrari.dimensions,paint:preview?.getObjectByName('body')?.material.color.getHexString(),metalness:1,roughness:.5,clearcoat:1,clearcoatRoughness:.03,exposure:renderer.toneMappingExposure,environment:'Venice Sunset 1K',directLights:0},coins:save.coins,races:save.races})
 });
`;
replace(' let last=performance.now()',install+' let last=performance.now()');
replace('now:performance.now()});',"now:performance.now(),paint:itemById(save.garage[selected].paint).color});");
replace('step(lastDt);','step(lastDt,cityStudy.drive());');
replace('requestAnimationFrame(frame);\n }',"if(!(new URLSearchParams(location.search).get('qa')==='1'&&new URLSearchParams(location.search).get('frozen')==='1'))requestAnimationFrame(frame);\n }");
replace(' updateCamera(true);requestAnimationFrame(frame);'," if(window.__raceQA)Object.assign(window.__raceQA,{cityLook:value=>{originalCockpit.setLook(value);updateCamera(true);renderScene(true);},cityBody:()=>({paint:visuals[0]?.body.getObjectByName('body').material.color.getHexString(),parameters:visuals[0]?.body.getObjectByName('body').material.toJSON(),sourceDimensions:ferrari.dimensions})});\n updateCamera(true);requestAnimationFrame(frame);");
replace('renderScene(false,now);frameCount++;','renderScene(false,now);frameCount++;cityStudy.frame(now);');
// Keep mutable catalog labels local to the study; the stock adapter only tints existing rims.
replace("import {CATALOG,CATEGORIES,normalizeSave,transact,tuning,itemById} from '../../garage-core.mjs?v=city-tour-1';","import {CATALOG as ORIGINAL_CATALOG,CATEGORIES,normalizeSave,transact,tuning,itemById} from '../../garage-core.mjs?v=city-tour-1';\nconst CATALOG=ORIGINAL_CATALOG.map(i=>i.category==='wheels'&&i.color?{...i,name:i.id==='wheels-gold'?'골드 림':'민트 림',description:'페라리 원본 휠의 색상만 변경'}:{...i});");
if(/localStorage|sessionStorage|installSaveTransfer|SAVE_KEY/.test(code))throw Error('Persistent storage dependency leaked');
await put('game.mjs','// Generated by scripts/build-ferrari-city.mjs. Do not edit this fork directly.\n// Original game SHA256: '+createHash('sha256').update(original.replaceAll('\r\n','\n')).digest('hex')+'\n'+code);
let html=(await read('index.html')).replaceAll('\r\n','\n');
html=html.replace('<head>','<head>\n  <base href="../../">');
html=html.replace(/<script type="module" src="\.\/game\.mjs[^\"]*"><\/script>/,'<link rel="stylesheet" href="./studies/ferrari-city/city.css?v=ferrari-city-2">\n  <script type="module" src="./studies/ferrari-city/game.mjs?v=ferrari-city-2"></script>');
html=html.replace('<title>드림 개러지: 스피드 그랑프리</title>','<title>페라리 도시 주행 시안 · 드림 개러지</title>');
html=html.replace('YOUR GARAGE. YOUR GRAND PRIX.','FERRARI · CITY STUDY');
html=html.replace('<h1>드림 개러지<span>스피드 그랑프리</span></h1>','<h1>페라리 458<span>도시 주행 시안</span></h1>');
html=html.replace('꿈꾸던 차를 만들고,<br>도시를 달려라!','만족한 외관 그대로,<br>운전석에서 도시를 달려요.');
html=html.replace('수변 도시에서 초대장이 도착했어요.<br>너만의 차로 첫 번째 그랑프리에 도전해 봐!','외관·운전석·실시간 거울을 함께 확인해요.<br>성능 측정에서는 약 50초 동안 자동으로 달려요.');
html=html.replace('로그인 없이 바로 플레이 · 진행은 이 브라우저에 저장돼요','기존 게임 저장과 완전히 분리 · 새로 열면 초기화');
html=html.replaceAll('Tavaculo','Ferrari 458').replace('구매한 물건은 두 차량에서 계속 쓸 수 있어요.','꾸미기는 이 창에서만 적용돼요.');
html=html.replace('나만의 드림 개러지','페라리 검토용 차고').replace('오늘은 어떤 차로 달려 볼까?','도장·휠·운전석을 확인한 뒤 출발해요.');
html=html.replace('슈퍼카 · 나만의 스타일','공식 예제 외관 · 원본 실내');
const entry='<button class="city-measure-entry" data-city-measure disabled>도시 성능 측정 · 약 50초</button>';
html=html.replace('<p class="welcome-loop">',entry+'<p class="welcome-loop">');
html=html.replace('<div class="menu-footer">',entry+'<p class="city-badge">시안용 꾸미기는 모두 열려 있어요. 주행 감각은 기존 게임 설정을 사용합니다.</p><div class="menu-footer">');
html=html.replace('<button id="resume"', '<div class="city-tools"><button id="city-auto" aria-pressed="false">검토용 자동 주행</button></div>'+entry+'<button id="resume"');
const creditStart=html.indexOf('<dialog id="credits"'),creditEnd=html.indexOf('</dialog>',creditStart)+9;
html=html.slice(0,creditStart)+`<dialog id="credits" aria-labelledby="credits-title"><h2 id="credits-title" tabindex="-1">함께 만든 도시</h2><p>Ferrari 458 Italia · vicent091036 / Three.js 공식 예제 자산. 원본 파일은 그대로 사용하며, 길이 4.527m에 맞추고 바퀴·계기판·후방 거울을 연결했습니다. 운전석 유리만 가독성을 조정했습니다.</p><p><a href="./assets/vehicle-compare/ferrari/NOTICE.txt" target="_blank" rel="noopener">모델·HDR·이용 조건과 출처</a> · <a href="./studies/ferrari-city/README.md" target="_blank" rel="noopener">시안의 변경 내용</a></p><p>F2002 · som_natalino, 도시·자연 · Kenney, 도로 · ambientCG (CC0). Three.js·cannon-es (MIT). 이 시안은 제조사의 공식 게임이 아니며, 주행 감각·기어·회전수는 기존 게임용 표현입니다.</p><button class="primary" data-close="credits">닫기</button></dialog>`+html.slice(creditEnd);
html=html.replace('<div id="hud" hidden>', '<div id="hud" hidden><div id="city-look"><button data-city-look="45" aria-label="누르는 동안 왼쪽 거울 확인">← 보기</button><button data-city-look="-65" aria-label="누르는 동안 오른쪽 거울 확인">보기 →</button></div>');
html=html.replace('</body>',`<dialog id="city-measure" aria-labelledby="city-measure-title"><h2 id="city-measure-title">도시에서 성능 확인</h2><p>현재 화면 크기로 실제 도시·주행 물리·상대차 3대를 함께 측정합니다. 외관과 운전석을 차례로 자동 주행해요. 운전석에는 룸미러와 화면에 보이는 사이드미러가 켜집니다.</p><p>가로 또는 세로 방향을 고정하고 화면을 켜 두세요. 각 시점은 5초 준비 후 20초 측정합니다. 장시간 발열이나 다른 기기의 성능까지 판단하는 검사는 아닙니다.</p><div class="city-tools"><button id="city-measure-start">약 50초 자동 측정 시작</button><button id="city-measure-close">닫기</button></div><p id="city-measure-status" role="status">화면 크기·표시 배율과 거울 설정도 결과에 포함됩니다.</p><label for="city-share">결과 전달용 텍스트</label><textarea id="city-share" readonly></textarea><div class="city-tools"><button id="city-copy">결과 복사</button></div></dialog><div id="city-progress" hidden><span id="city-progress-text"></span><button id="city-measure-cancel">중단</button></div><script id="city-state" type="application/json">{}</script><script id="city-performance-state" type="application/json">{}</script><script id="city-errors" type="application/json">[]</script><script>const cityErrors=[];for(const kind of ['error','unhandledrejection'])addEventListener(kind,e=>{cityErrors.push(String(e.message||e.reason||'Resource error'));document.getElementById('city-errors').textContent=JSON.stringify(cityErrors);});</script></body>`);
await put('index.html',html);console.log('Generated isolated Ferrari city entry and game fork.');
