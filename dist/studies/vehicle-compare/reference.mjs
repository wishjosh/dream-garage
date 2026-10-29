import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {DRACOLoader} from './DRACOLoader.js';
import {REFERENCE,loadReferenceAssets,prepareFerrari,addReferenceShadow,referenceGrid} from './ferrari-reference.mjs';
const renderer=new T.WebGLRenderer({canvas:document.querySelector('#world'),antialias:true});
renderer.setPixelRatio(devicePixelRatio);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
const scene=new T.Scene();scene.background=new T.Color(0x333333);scene.fog=new T.Fog(0x333333,10,15);
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.1,100);camera.position.set(4.25,1.4,-4.5);camera.lookAt(0,.5,0);
const grid=referenceGrid();scene.add(grid);let car,animated=false,animationFrame=0,wheels=[];
function draw(){renderer.render(scene,camera);}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();draw();}addEventListener('resize',resize);resize();
function animate(){if(!animated)return;const time=-performance.now()/1000;for(const wheel of wheels)wheel.rotation.x=time*Math.PI*2;grid.position.z=-time%1;draw();animationFrame=requestAnimationFrame(animate);}
document.querySelector('#animate').onclick=()=>{animated=!animated;document.querySelector('#animate').setAttribute('aria-pressed',String(animated));if(animated)animate();else{cancelAnimationFrame(animationFrame);animationFrame=0;for(const wheel of wheels)wheel.rotation.x=0;grid.position.z=0;draw();}};
const decoder=new DRACOLoader();decoder.setDecoderPath(new URL('./draco/',import.meta.url).href);decoder.setDecoderConfig({type:'wasm'});const loader=new GLTFLoader();loader.setDRACOLoader(decoder);
try{
 const [assets,gltf]=await Promise.all([loadReferenceAssets(),loader.loadAsync(new URL('../../assets/vehicle-compare/ferrari/ferrari.glb',import.meta.url).href)]);
 scene.environment=assets.environment;car=prepareFerrari(gltf.scene.children[0]);addReferenceShadow(car,assets.shadow);scene.add(car);wheels=['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].map(name=>car.getObjectByName(name));draw();
 const body=car.getObjectByName('body').material;document.querySelector('#reference-state').textContent=JSON.stringify({ready:true,threeRevision:T.REVISION,...REFERENCE,camera:camera.position.toArray(),target:[0,.5,0],fov:camera.fov,modelScale:car.scale.toArray(),modelRotation:car.rotation.toArray(),bodyColor:body.color.getHexString(),environment:'venice_sunset_1k.hdr',shadow:'ferrari_ao.png',extraLights:0,meshTriangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio()});document.querySelector('#status').textContent='공식 표현 준비 완료 · 기본은 정지 화면입니다.';
}catch(error){document.querySelector('#status').textContent='불러오지 못했어요. 다시 열어 주세요.';console.error(error);}finally{decoder.dispose();}