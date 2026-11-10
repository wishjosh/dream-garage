import * as T from '../../vendor/three.module.js';
import {HDRLoader} from '../vehicle-compare/HDRLoader.js';
import {createMarinaCourse,BLOCKS,STREETS,WATER} from '../../marina-city/plan.mjs';
import {buildMarinaCity} from '../../marina-city/scene.mjs';
import {trackFrame} from '../../race-core.mjs';
const track=createMarinaCourse(),svg=document.querySelector('#plan'),ns='http://www.w3.org/2000/svg';
function shape(tag,attrs){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;}
WATER.forEach(p=>shape('polygon',{points:p.map(a=>a.join(',')).join(' '),fill:'#8ba9ac'}));
STREETS.forEach(s=>shape('path',{d:`M${s.a.join(' ')}L${s.b.join(' ')}`,stroke:'#f5f2e9','stroke-width':s.width+6}));
BLOCKS.forEach(b=>shape('rect',{x:b.x-b.w/2,y:b.z-b.d/2,width:b.w,height:b.d,rx:5,fill:b.kind==='park'?'#a1b18e':b.kind==='office'?'#73898c':'#b2b9aa'}));
shape('path',{d:'M'+track.frames.filter((_,i)=>i%3===0).map(f=>[f.x,f.z].join(' ')).join('L')+'Z',fill:'none',stroke:'#b85c3d','stroke-width':6,'stroke-linejoin':'round'});
shape('circle',{cx:track.frames[0].x,cy:track.frames[0].z,r:10,fill:'#243e31'});
for(const [x,z,text]of [[-105,-340,'START / PIT'],[-25,-10,'CIVIC PARK'],[105,212,'MARINA BAY'],[375,220,'BRIDGE'],[-265,220,'GARDEN']]){const t=shape('text',{x,y:z,'font-size':17,'text-anchor':'middle',fill:'#304338','font-family':'Arial','font-weight':600});t.textContent=text;}
const canvas=document.querySelector('#scene'),renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,16/9,.1,2500);let ready=false,view='overview';
const captions={overview:'도로망 사이에 놓인 시가지와 공원, 안쪽 만을 잇는 교량.',start:'4.5m 차량을 기준으로 맞춘 도로·피트·수목과 도심 스카이라인.',civic:'공원과 문화시설 사이의 교차로를 이어 달리는 구간.',bridge:'안쪽 만과 바깥 물길을 잇는 수로를 건너는 교량.',bay:'건물 사이에서 열린 수변으로. 산책로 너머 도시의 방향을 읽습니다.'};
function position(){if(view==='overview'){camera.position.set(780,780,880);camera.lookAt(-30,0,30);}else{const dist={start:35,civic:620,bridge:1295,bay:1670}[view],f=trackFrame(track,dist),target=trackFrame(track,dist+70);camera.position.set(f.x-f.tx*8,4.2,f.z-f.tz*8);camera.lookAt(target.x,3,target.z);}}
function render(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.near=view==='overview'?5:.3;camera.updateProjectionMatrix();position();if(ready){renderer.render(scene,camera);document.querySelector('#save-view').href=canvas.toDataURL('image/png');}}
try{const env=await new HDRLoader().loadAsync('../../assets/vehicle-compare/ferrari/venice_sunset_1k.hdr');env.mapping=T.EquirectangularReflectionMapping;scene.environment=env;await buildMarinaCity(scene,track,{renderer});ready=true;document.querySelector('#loading').hidden=true;document.querySelector('#save-view').hidden=false;render();}catch(e){document.querySelector('#loading').textContent='장면을 불러오지 못했어요. 새로고침해 주세요.';console.error(e);}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;for(const c of document.querySelectorAll('[data-view]'))c.setAttribute('aria-pressed',String(c===b));document.querySelector('#view-caption').textContent=captions[view];render();};new ResizeObserver(render).observe(canvas);
