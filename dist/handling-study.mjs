import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {createOriginalCockpit} from './original-cockpit.mjs?v=original-city-1';
import {createRearView} from './rear-view.mjs?v=handling-1';
import {splitWheelVisuals} from './wheel-visual.mjs?v=wheels-1';
import {createSteeringState,stepSteering} from './cockpit-study-steering.mjs?v=steering-look-1';
import {DT,CAR,CORNER,clamp,createCar,stepCar,cornerPoint,nearestCorner} from './handling-physics.mjs?v=handling-1';
import {createControls,clearControls,setControlMode,slideValue,pressControl,moveSlide,releaseControl,readControls} from './handling-input.mjs?v=handling-1';
const $=id=>document.getElementById(id),controls=createControls(),attempts=new Map(),trace=[];
let state=createCar(),ready=false,running=false,paused=false,view='cockpit',accumulator=0,averageMs=16,oldLandscape=innerWidth>innerHeight;
const gaze=createSteeringState(),bodyQuaternion=new T.Quaternion(),bodyEuler=new T.Euler(0,0,0,'YXZ');
let renderer,scene,camera,original,rear,body,wheelParts,rig,previousSkid=null,skidCount=0,skidIndex=0,lastSample=0,hudTime=0;
const speedChoice=()=>Number(document.querySelector('input[name=speed]:checked').value);
function setPanel(show,title,copy){$('panel').hidden=!show;if(title)$('panel-title').textContent=title;if(copy)$('panel-copy').textContent=copy;}
function saveAttempt(){if(state.time<.5)return;attempts.set(controls.mode+':'+speedChoice(),{mode:controls.mode,speed:speedChoice(),time:state.time,hits:state.hits,under:state.underTime,over:state.overTime,trace:trace.map(p=>({...p}))});}
function resetRun({archive=true}={}){
 if(archive)saveAttempt();clearControls(controls);state=createCar(speedChoice());trace.length=0;trace.push({x:state.x,z:state.z});lastSample=0;
 accumulator=0;gaze.amount=gaze.lookDegrees=0;running=false;paused=false;previousSkid=null;skidCount=skidIndex=0;lastSkid=0;
 original?.reset();$('resume').hidden=true;$('pause').textContent='Ⅱ';$('start').textContent=speedChoice()+' km/h로 출발';
 const prior=attempts.get((controls.mode==='buttons'?'slide':'buttons')+':'+speedChoice());
 $('last-run').textContent=prior?`${prior.mode==='buttons'?'좌우 버튼':'엄지 슬라이드'} 주행선이 지도에 남아 있어요 · 벽 접촉 ${prior.hits}회`:'조향 방식을 바꿔도 같은 출발 조건으로 시작합니다.';
 setPanel(true,'핸들을 얼마나 꺾을까요?','가속을 놓고 코너를 돌아 본 뒤, 가속하면서 다시 달려 보세요. 빠르면 먼저 감속하고 조금씩 핸들을 조절해 보세요.');
 updateVisuals(true);paintControls();
}
function startRun(){if(!ready)return;clearControls(controls);running=true;paused=false;setPanel(false);$('resume').hidden=true;}
function pauseRun(message='잠깐 쉬어 갈까요?'){if(!running)return;clearControls(controls);running=false;paused=true;$('resume').hidden=false;$('start').textContent='같은 조건으로 다시 출발';setPanel(true,message,'계속 달리거나 같은 출발 속도로 다시 비교할 수 있어요.');paintControls();}
function finishRun(){saveAttempt();clearControls(controls);running=false;paused=false;state.done=true;$('resume').hidden=true;$('start').textContent='같은 조건으로 다시 출발';
 setPanel(true,'이번 코너는 어땠나요?',`벽 접촉 ${state.hits}회 · 앞이 밀린 시간 ${state.underTime.toFixed(1)}초 · 뒤가 흐른 시간 ${state.overTime.toFixed(1)}초`);
 $('last-run').textContent='위의 조향 방식을 바꾸면 같은 출발 속도로 비교할 수 있어요.';paintControls();}
$('start').onclick=()=>{if(state.done||paused||state.time>.05)resetRun();startRun();};
$('resume').onclick=()=>{if(!ready||state.done)return;clearControls(controls);running=true;paused=false;setPanel(false);};
$('pause').onclick=()=>paused?$('resume').click():pauseRun();$('retry').onclick=()=>{if(ready)resetRun();};
for(const mode of ['buttons','slide'])$(mode+'-mode').onclick=()=>{if(controls.mode===mode)return;saveAttempt();setControlMode(controls,mode);$('buttons-mode').setAttribute('aria-pressed',String(mode==='buttons'));$('slide-mode').setAttribute('aria-pressed',String(mode==='slide'));$('button-steering').hidden=mode!=='buttons';$('slide-steering').hidden=mode!=='slide';if(ready)resetRun({archive:false});};
for(const radio of document.querySelectorAll('input[name=speed]'))radio.onchange=()=>{if(ready)resetRun({archive:false});};
$('view').onclick=()=>{clearControls(controls);view=view==='cockpit'?'chase':'cockpit';$('view').textContent=view==='cockpit'?'차 뒤':'운전석';gaze.amount=gaze.lookDegrees=0;updateVisuals(true);paintControls();};
function paintControls(){
 for(const b of document.querySelectorAll('[data-action]')){const active=[...controls.held.values()].includes(b.dataset.action);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 $('thumb-knob').style.left=(50-controls.value*39)+'%';$('thumb-slider').setAttribute('aria-valuenow',String(Math.round(-controls.value*100)));$('steer-needle').style.left=(50-controls.value*46)+'%';
}
for(const b of document.querySelectorAll('[data-action]')){
 b.onpointerdown=e=>{if(!running||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();pressControl(controls,e.pointerId,b.dataset.action);try{b.setPointerCapture(e.pointerId);}catch{}paintControls();};
 b.onpointermove=e=>{const held=controls.held.get(e.pointerId);if(!held||held==='slide')return;e.preventDefault();const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-action]');
 const steering=['left','right','steering-empty'].includes(held);if(hit&&['left','right'].includes(hit.dataset.action)===steering)controls.held.set(e.pointerId,hit.dataset.action);else controls.held.set(e.pointerId,steering?'steering-empty':'pedal-empty');paintControls();};
 b.onlostpointercapture=e=>{releaseControl(controls,e.pointerId);paintControls();};
}
const slider=$('thumb-slider');
slider.onpointerdown=e=>{if(!running||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();const r=slider.getBoundingClientRect();if(pressControl(controls,e.pointerId,'slide',slideValue(e.clientX,r.left,r.width))){try{slider.setPointerCapture(e.pointerId);}catch{}}paintControls();};
slider.onpointermove=e=>{if(controls.sliderId!==e.pointerId)return;e.preventDefault();const r=slider.getBoundingClientRect();moveSlide(controls,e.pointerId,slideValue(e.clientX,r.left,r.width));};
slider.onlostpointercapture=e=>{releaseControl(controls,e.pointerId);paintControls();};
for(const event of ['pointerup','pointercancel'])addEventListener(event,e=>{releaseControl(controls,e.pointerId);paintControls();});
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyX'].includes(e.code)&&running){e.preventDefault();controls.keys.add(e.code);}if(e.code==='Escape'||e.code==='KeyP')pauseRun();});
addEventListener('keyup',e=>controls.keys.delete(e.code));addEventListener('blur',()=>pauseRun('잠시 멈췄어요'));
addEventListener('visibilitychange',()=>{if(document.hidden)pauseRun('잠시 멈췄어요');});
addEventListener('resize',()=>{clearControls(controls);const landscape=innerWidth>innerHeight;if(landscape!==oldLandscape)pauseRun('화면 방향이 바뀌었어요');oldLandscape=landscape;if(renderer){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();updateVisuals(true);}paintControls();});

let skidGeometry,skidPositions,skidMesh;
function simulate(dt,forced){
 const drive=forced||readControls(controls,dt);stepCar(state,drive,dt);stepSteering(gaze,-drive.steer,dt,true);
 if(state.time-lastSample>=.05){trace.push({x:state.x,z:state.z});if(trace.length>1000)trace.shift();lastSample=state.time;}
 if(skidPositions&&state.time-lastSkid>=.05){lastSkid=state.time;const slipping=state.handling!=='grip';
  const p=[-1,1].map(side=>({x:state.x-Math.sin(state.heading)*1.15+Math.cos(state.heading)*side*.85,z:state.z-Math.cos(state.heading)*1.15-Math.sin(state.heading)*side*.85}));
  if(slipping&&previousSkid)p.forEach((a,i)=>{const b=previousSkid[i],offset=skidIndex*6;skidPositions.set([b.x,.071,b.z,a.x,.071,a.z],offset);skidIndex=(skidIndex+1)%900;skidCount=Math.min(900,skidCount+1);});
  previousSkid=slipping?p:null;
 }
 if(state.time>=30||nearestCorner(state.x,state.z).s>CORNER.end)finishRun();
}
let lastSkid=0;
function updateHUD(){
 $('speed').textContent=Math.round(Math.hypot(state.u,state.v)*3.6);$('gear').textContent=state.u<-.3?'R':Math.abs(state.u)<.2?'N':Math.min(6,1+Math.floor(Math.abs(state.u)*3.6/37));
 const names={grip:'접지 안정',understeer:'앞이 밀려요 · 감속해 보세요',oversteer:'뒤가 흘러요 · 가속을 줄여 보세요'};
 $('handling').textContent=names[state.handling];$('handling').dataset.state=state.handling;$('front-grip').value=clamp(state.frontUse,0,1);$('rear-grip').value=clamp(state.rearUse,0,1);
 const s=nearestCorner(state.x,state.z).s;$('tip').textContent=state.hits?'벽 접촉 '+state.hits+'회 · ↻ 버튼으로 같은 조건에서 다시 도전':s<0?'코너까지 '+Math.max(0,Math.round(-s))+'m · 왼쪽으로 조금씩 조향':s<63?'핸들을 유지하며 속도와 주행선을 살펴보세요':'핸들을 풀고 출구로 달려 보세요';
 paintControls();drawMap();
}
function drawMap(){
 const c=$('map'),x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);
 const pt=p=>[250-p.x*1.65,95-p.z*1.55];x.lineCap='round';
 x.beginPath();for(let s=-55;s<145;s+=2){const p=pt(cornerPoint(s));s===-55?x.moveTo(...p):x.lineTo(...p);}x.strokeStyle='#4b6576';x.lineWidth=17;x.stroke();x.strokeStyle='#839ba653';x.lineWidth=1;x.stroke();
 const other=attempts.get((controls.mode==='buttons'?'slide':'buttons')+':'+speedChoice());
 function line(points,color){if(!points?.length)return;x.beginPath();points.forEach((p,i)=>{const q=pt(p);i?x.lineTo(...q):x.moveTo(...q);});x.lineWidth=2.5;x.strokeStyle=color;x.stroke();}
 line(other?.trace,'#ffc58b');line(trace,'#80f5de');const p=pt(state);x.save();x.translate(...p);x.rotate(-state.heading);x.fillStyle='#efffff';x.beginPath();x.moveTo(0,-7);x.lineTo(-4,5);x.lineTo(4,5);x.closePath();x.fill();x.restore();
 x.font='15px system-ui';x.fillStyle='#81f5df';x.fillText('● 이번',12,22);if(other){x.fillStyle='#ffc58b';x.fillText('● 다른 조작',110,22);}
}
function updateVisuals(force=false){
 if(!ready)return;
 bodyEuler.set(-state.ax*.0025,state.heading,clamp(state.ay*.002,-.035,.035));bodyQuaternion.setFromEuler(bodyEuler);
 const player={x:state.x,y:.045,z:state.z,heading:state.heading,speed:Math.hypot(state.u,state.v),forwardSpeed:state.u,quaternion:bodyQuaternion.toArray(),driveMode:state.reverse?'reverse':state.braking?'brake':state.gas>.1?'forward':'coast'};
 body.position.set(state.x,.045,state.z);body.quaternion.copy(bodyQuaternion);body.visible=view==='chase';
 const qSteer=new T.Quaternion(),qSpin=new T.Quaternion(),qWorld=new T.Quaternion(),v=new T.Vector3();
 rig.wheels.forEach((w,i)=>{qSteer.setFromAxisAngle(new T.Vector3(0,1,0),w.front?state.steer:0);qWorld.copy(bodyQuaternion).multiply(qSteer);qSpin.setFromAxisAngle(new T.Vector3(1,0,0),state.wheelAngle);v.fromArray(w.position).applyQuaternion(bodyQuaternion);v.x+=state.x;v.y+=.045;v.z+=state.z;
  for(const object of [wheelParts.wheels[i],wheelParts.calipers[i]]){object.position.copy(v);object.quaternion.copy(qWorld);object.visible=view==='chase';}wheelParts.wheels[i].quaternion.multiply(qSpin);
 });
 original.group.visible=view==='cockpit';original.mirrorMount.visible=view==='cockpit'&&innerWidth>=innerHeight;
 original.update({player,steeringAmount:-state.steer/.46,lookDegrees:gaze.lookDegrees,now:state.time*1000});
 if(view==='cockpit'){original.applyCamera();}else{camera.fov=60;camera.near=.1;camera.up.set(0,1,0);camera.position.set(state.x-Math.sin(state.heading)*7.7,3.4,state.z-Math.cos(state.heading)*7.7);camera.lookAt(state.x+Math.sin(state.heading)*8,1,state.z+Math.cos(state.heading)*8);camera.updateProjectionMatrix();}
 rear.update({player,enabled:view==='cockpit',paused:!running,now:performance.now(),force,frameMs:averageMs,hide:[body,...wheelParts.wheels,...wheelParts.calipers],portrait:innerWidth<innerHeight,viewportWidth:innerWidth,viewportHeight:innerHeight,overlayY:220});
 if(skidGeometry){skidGeometry.attributes.position.needsUpdate=true;skidGeometry.setDrawRange(0,skidCount*2);}
 renderer.render(scene,camera);updateHUD();
}
function fail(error){console.error(error);$('loading').hidden=false;$('loading').textContent='화면을 준비하지 못했어요. 새로고침해 주세요.';}
async function boot(){
 renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 scene=new T.Scene();scene.background=new T.Color('#122139');scene.fog=new T.FogExp2('#19324a',.0035);camera=new T.PerspectiveCamera(42.386,innerWidth/innerHeight,.035,700);scene.add(camera);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.65;pmrem.dispose();room.dispose();scene.add(new T.HemisphereLight('#c6eaff','#1d2f3d',1.4));
 const sun=new T.DirectionalLight('#b2d7ff',1.5);sun.position.set(-30,70,-10);scene.add(sun);const warm=new T.DirectionalLight('#ffe4bf',.6);warm.position.set(50,20,60);scene.add(warm);
 const geo=new T.BoxGeometry(1,1,1),mat=(color)=>new T.MeshStandardMaterial({color,roughness:.8});
 const materials={road:mat('#65737e'),walk:mat('#40596c'),dark:mat('#1b344a'),white:mat('#d7e5e5'),cyan:new T.MeshBasicMaterial({color:'#65efed'}),pink:new T.MeshBasicMaterial({color:'#ff85ad'})};
 const batches=new Map();
 function box(size,pos,m,rotation=0){if(!batches.has(m))batches.set(m,[]);batches.get(m).push({size,pos,rotation});}
 box([600,.5,600],[50,-.3,0],mat('#203b48'));
 const roadFrames=[];for(let s=-130;s<=210;s+=1.5)roadFrames.push(cornerPoint(s));
 function ribbon(width,y,m){const pos=[],idx=[],uv=[];roadFrames.forEach((f,i)=>{for(const side of [-1,1]){pos.push(f.x+Math.cos(f.heading)*width*side,y,f.z-Math.sin(f.heading)*width*side);uv.push((side+1)*width/7,(f.s+130)/7);}if(i<roadFrames.length-1){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();scene.add(new T.Mesh(g,m));}
 const asphalt=await new T.TextureLoader().loadAsync('./assets/materials/asphalt-color.jpg');asphalt.colorSpace=T.SRGBColorSpace;asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;materials.road.map=asphalt;
 ribbon(12,.01,materials.walk);ribbon(8,.045,materials.road);
 for(let s=-125;s<=205;s+=5){const p=cornerPoint(s);for(const side of [-1,1]){const x=p.x+Math.cos(p.heading)*8.5*side,z=p.z-Math.sin(p.heading)*8.5*side;box([.38,.9,4.8],[x,.47,z],Math.round(s)%3?materials.dark:materials.white,p.heading);box([.045,.07,4.9],[x-Math.cos(p.heading)*side*.22,.94,z+Math.sin(p.heading)*side*.22],side>0?materials.cyan:materials.pink,p.heading);}if(Math.round(s)%10===0)box([.12,.015,2.6],[p.x,.065,p.z],materials.white,p.heading);}
 const wc=document.createElement('canvas');wc.width=64;wc.height=128;const wx=wc.getContext('2d');wx.fillStyle='#16384b';wx.fillRect(0,0,64,128);for(let row=0;row<16;row++)for(let col=0;col<5;col++)if((row*7+col*3)%7<5){wx.fillStyle=(row+col)%4?'#c9ac7b':'#6dc7d8';wx.fillRect(4+col*12,4+row*8,5,4);}const wt=new T.CanvasTexture(wc);wt.colorSpace=T.SRGBColorSpace;const buildingMat=new T.MeshStandardMaterial({map:wt,emissiveMap:wt,emissive:'#fff',emissiveIntensity:.6});
 for(let i=0;i<42;i++){const p=cornerPoint(-110+i*7.3),side=i%2?1:-1,d=23+(i%4)*12,h=20+(i*13)%51;const x=p.x+Math.cos(p.heading)*d*side,z=p.z-Math.sin(p.heading)*d*side;box([9+i%3*3,h,13],[x,h/2,z],buildingMat);box([10+i%3*3,.2,14],[x,h+.2,z],i%2?materials.cyan:materials.pink);}
 for(let s=-100;s<180;s+=20){const p=cornerPoint(s);for(const side of [-1,1]){const x=p.x+Math.cos(p.heading)*11*side,z=p.z-Math.sin(p.heading)*11*side;box([.15,9,.15],[x,4.5,z],materials.dark);box([1.4,.12,.5],[x,9,z],materials.cyan);}}
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;const sx=signCanvas.getContext('2d');sx.fillStyle='#123049';sx.fillRect(0,0,512,128);sx.fillStyle='#a5ffdf';sx.font='bold 44px system-ui';sx.textAlign='center';sx.fillText('← BAYFRONT  /  90°',256,78);const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(12,3),new T.MeshBasicMaterial({map:signTexture,side:T.DoubleSide}));sign.position.set(0,7,-8);sign.rotation.y=Math.PI;scene.add(sign);box([.3,8,.3],[-8.7,4,-8],materials.dark);box([.3,8,.3],[8.7,4,-8],materials.dark);
 skidPositions=new Float32Array(900*6);skidGeometry=new T.BufferGeometry();skidGeometry.setAttribute('position',new T.BufferAttribute(skidPositions,3));skidGeometry.setDrawRange(0,0);skidMesh=new T.LineSegments(skidGeometry,new T.LineBasicMaterial({color:'#17212b',transparent:true,opacity:.7}));skidMesh.frustumCulled=false;scene.add(skidMesh);
 // Repeated city objects share instanced draws for phone GPUs.
 const dummy=new T.Object3D();for(const [material,items] of batches){const mesh=new T.InstancedMesh(geo,material,items.length);items.forEach((item,i)=>{dummy.position.set(...item.pos);dummy.scale.set(...item.size);dummy.rotation.set(0,item.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);}
 const loader=new GLTFLoader();const [cockpit,asset,rigs]=await Promise.all([createOriginalCockpit({scene,camera,loader}),loader.loadAsync('./assets/tavaculo-rigged.glb'),fetch('./assets/vehicle-rigs.json').then(r=>r.json())]);original=cockpit;rig=rigs.tavaculo;body=asset.scene;
 // The rigged asset already matches vehicle-rigs.json; do not independently normalize wheels.
 wheelParts=splitWheelVisuals(body,rig);scene.add(body,...wheelParts.wheels,...wheelParts.calipers);
 rear=createRearView({renderer,scene,camera,cockpit:original.group,surface:original.mirrorSurface});
 ready=true;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();$('loading').hidden=true;$('start').disabled=false;$('view').textContent='차 뒤';resetRun({archive:false});
 if(new URLSearchParams(location.search).get('qa')==='1')window.__handlingQA={
  snapshot:()=>({ready,running,paused,mode:controls.mode,view,preset:speedChoice(),state:{...state},input:{value:controls.value,target:controls.target,sliderId:controls.sliderId,held:[...controls.held],keys:[...controls.keys]},trace:trace.length,attempts:[...attempts.values()].map(({trace,...a})=>({...a,points:trace.length})),camera:{aspect:camera.aspect,fov:camera.fov,near:camera.near},canvas:{width:$('world').clientWidth,height:$('world').clientHeight,inlineWidth:$('world').style.width,inlineHeight:$('world').style.height},original:original.stats(),mirror:rear.stats(),frameMs:averageMs,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,storageUsed:false}),
  advance:(seconds,input)=>{for(let t=0;t<seconds-DT/2&&running;t+=DT)simulate(DT,input);updateVisuals(true);},
  restorePose:values=>{for(const key of ['x','z','heading','u','v','yawRate','steer','gas','ax','ay'])if(Number.isFinite(values[key]))state[key]=values[key];updateVisuals(true);},
 };
 let previous=performance.now();
 function frame(now){const elapsed=Math.min(.08,(now-previous)/1000);previous=now;averageMs=averageMs*.98+elapsed*1000*.02;if(running){accumulator+=elapsed;let n=0;while(accumulator>=DT&&n++<10){simulate(DT);accumulator-=DT;if(!running)break;}}else accumulator=0;
  hudTime+=elapsed;if(hudTime>=1/30||running){updateVisuals();hudTime=0;}requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
}
boot().catch(fail);
