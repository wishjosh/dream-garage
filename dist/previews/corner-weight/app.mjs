import * as T from '../../vendor/three.module.js';
import {raceCourse} from '../../race-courses.mjs';
import {loadFerrari,dressCar} from '../../studies/ferrari-city/asset.mjs';
import {loadLineupModel} from '../../lineup-models.mjs';
import {buildCircuit} from '../../studies/coastal-motion/circuit.mjs';
import {prepareRaceVisual} from '../../race-rendering.mjs';
import {splitWheelVisuals,syncWheelVisuals} from '../../wheel-visual.mjs';
import {createCameraRig,moveShell,prepareCar} from '../hood-view/studies/coastal-motion/motion.mjs';
import {createRun,EXIT,FIXED_DT} from './run.mjs';

const $ = id => document.getElementById(id);
const names = {tavaculo:'페라리 458','muscle-coupe':'머슬 쿠페'};
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const stillPose = {pitch:0,roll:0};
const keyControls = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'throttle',ArrowDown:'brake',Space:'brake'};

$('retry').onclick = () => location.reload();

async function openComparison(){
  const renderer = new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
  const still = $('still'), stillContext = still.getContext('2d',{alpha:false});
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .85;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(52,1,.12,700);
  const track = raceCourse('braking').create();
  const [ferrari,muscle] = await Promise.all([loadFerrari(),loadLineupModel('muscle-coupe'),buildCircuit(scene,track,renderer)]);
  scene.environment = ferrari.assets.environment;
  const models = new Map();
  for (const [car,model] of [['tavaculo',ferrari],['muscle-coupe',muscle]]){
    const body = model.exterior;
    const stock = {paint:'paint-stock',wheels:'wheels-stock'};
    if (car === 'tavaculo'){
      dressCar(body,car,stock,model.rig);
      body.getObjectByName('body').material.color.set('#cc3027');
    }
    const lamps = prepareCar(body,car,{player:true,...stock});
    const {wheels,calipers} = splitWheelVisuals(body,model.rig);
    prepareRaceVisual({body,wheels,calipers}).setOptimized(true);
    const group = new T.Group();
    group.add(body,...wheels,...calipers);
    scene.add(group);
    models.set(car,{group,body,wheels,calipers,lamps,rig:model.rig});
  }
  const contact = new T.Mesh(new T.PlaneGeometry(2.9,5.6),new T.MeshBasicMaterial({
    map:ferrari.assets.shadow,transparent:true,premultipliedAlpha:true,depthWrite:false,blending:T.MultiplyBlending,toneMapped:false
  }));
  contact.rotation.order = 'YXZ';
  contact.rotation.x = -Math.PI/2;
  scene.add(contact);

  let car = 'tavaculo', view = 'chase', manual = false, paused = false, ended = false;
  let allowTilt = !motionPreference.matches, run, carry = 0, leadIn = .75, last = null;
  const keys = new Set(), pointers = new Map();
  const driveButtons = [...document.querySelectorAll('[data-input]')];
  const carButtons = [...document.querySelectorAll('[data-car]')];
  const cameraRig = createCameraRig((racer,reduce) => reduce ? stillPose : run.pose);

  function controls(){
    const active = new Set([...keys].map(code => keyControls[code]).concat([...pointers.values()]));
    return Object.fromEntries(driveButtons.map(button => [button.dataset.input,active.has(button.dataset.input)]));
  }
  function paintControls(){
    const input = controls();
    for (const button of driveButtons) button.classList.toggle('pressed',input[button.dataset.input]);
  }
  function release(){keys.clear();pointers.clear();paintControls();}
  function displayMessage(text){
    $('message').textContent = text;
    $('message').hidden = !text;
  }
  function updatePause(){
    $('pause').textContent = paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label',paused ? '계속 달리기' : '일시정지');
    $('pause').disabled = ended;
  }
  function resize(){
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.setSize(innerWidth,innerHeight,false);
    camera.aspect = innerWidth/innerHeight;
    if (run) draw(0,true);
  }
  function draw(dt,snap=false){
    const model = models.get(car), racer = run.racer;
    const pose = allowTilt ? run.pose : stillPose;
    moveShell(model.body,model.lamps,racer,!allowTilt,pose);
    syncWheelVisuals(model.wheels,model.calipers,racer.wheels);
    contact.position.set(racer.x,.062,racer.z);
    contact.rotation.y = racer.heading;
    cameraRig({camera,racer,view,dt,snap,reduce:!allowTilt});
    renderer.render(scene,camera);
    // Keep a composited frame while WebKit parks its 3D layer at a stop or after rotation.
    still.hidden = !(paused || ended);
    if (!still.hidden){
      const world = renderer.domElement;
      if (still.width!==world.width || still.height!==world.height){
        still.width = world.width;still.height = world.height;
      }
      stillContext.drawImage(world,0,0);
    }
    $('speed').textContent = Math.round(racer.speed*3.6);
    const phase = ended ? '코너 통과' : racer.braking ? '제동' : racer.s>=150 ? '탈출' : racer.s>=83 ? '선회' : '진입';
    $('phase').textContent = (manual ? '직접' : '자동')+' · '+phase;
  }
  function restart(){
    release();
    run?.dispose();
    run = createRun(track,car,models.get(car).rig);
    for (const [id,model] of models) model.group.visible = id === car;
    for (const button of carButtons) button.setAttribute('aria-pressed',String(button.dataset.car===car));
    document.body.classList.toggle('manual',manual);
    $('drive').hidden = !manual;
    $('mode').textContent = manual ? '자동 비교' : '직접 운전';
    paused = false; ended = false; carry = 0; leadIn = .75; last = null;
    updatePause();
    displayMessage('');
    draw(0,true);
  }
  function setPaused(value){
    if (ended) return;
    paused = value; last = null; release(); updatePause();
    displayMessage(paused ? '일시정지' : '');
    draw(0);
  }
  function frame(time){
    const dt = last===null ? 0 : Math.min((time-last)/1000,.09);
    last = time;
    if (!paused && !ended && !document.hidden){
      if (leadIn>0) leadIn -= dt;
      else {
        carry += dt;
        const input = manual ? controls() : null;
        while (carry>=FIXED_DT && !ended){
          run.tick(input);
          carry -= FIXED_DT;
          if (run.racer.distance>=EXIT){
            ended = true; release(); updatePause();
            displayMessage('첫 코너 통과 · 다른 차를 눌러 비교하세요');
          }
        }
      }
      draw(dt);
    }
    requestAnimationFrame(frame);
  }

  for (const button of carButtons) button.onclick = () => {car=button.dataset.car;restart();};
  $('restart').onclick = restart;
  $('mode').onclick = () => {manual=!manual;restart();};
  $('pause').onclick = () => setPaused(!paused);
  $('view').onclick = () => {
    view = view==='chase' ? 'hood' : 'chase';
    const target = view==='chase' ? '보닛' : '차체';
    $('view').textContent = target+' 보기';
    $('view').setAttribute('aria-label',target+' 시점으로 전환');
    draw(0,true);
  };
  function updateMotionOption(){
    allowTilt = !motionPreference.matches;
    $('motion').hidden = !motionPreference.matches;
    $('motion').textContent = '기울기 켜기';
    if (run) draw(0,true);
  }
  $('motion').onclick = () => {
    allowTilt = !allowTilt;
    $('motion').textContent = allowTilt ? '기울기 끄기' : '기울기 켜기';
    draw(0,true);
  };
  motionPreference.addEventListener('change',updateMotionOption);
  for (const button of driveButtons){
    button.onpointerdown = event => {
      if (paused || ended) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId,button.dataset.input);
      paintControls();
    };
    button.onpointerup = button.onpointercancel = button.onlostpointercapture = event => {
      pointers.delete(event.pointerId);paintControls();
    };
    button.oncontextmenu = event => event.preventDefault();
  }
  addEventListener('keydown',event => {
    if (manual && !ended && !paused && keyControls[event.code] && !(event.code==='Space' && event.target.tagName==='BUTTON')){
      event.preventDefault();keys.add(event.code);paintControls();
    }
  });
  addEventListener('keyup',event => {keys.delete(event.code);paintControls();});
  addEventListener('blur',() => {if(!ended) setPaused(true);});
  document.addEventListener('visibilitychange',() => {if(document.hidden) setPaused(true);});
  addEventListener('resize',resize);
  $('world').addEventListener('webglcontextlost',event => {
    event.preventDefault();setPaused(true);showError('화면 연결이 끊겼습니다. 다시 열어 주세요.');
  });
  updateMotionOption();
  resize();
  restart();
  $('loading').hidden = true;
  $('hud').hidden = false;
  requestAnimationFrame(frame);
}
function showError(message){
  $('hud').hidden = true;
  $('loading').hidden = false;
  $('load-note').textContent = message;
  $('retry').hidden = false;
}
openComparison().catch(error => {
  console.error(error);
  showError('코스나 차를 불러오지 못했습니다. 연결을 확인한 뒤 다시 열어 주세요.');
});
