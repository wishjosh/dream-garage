import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createRearView} from '../dist/rear-view.mjs';

const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,actual+' != '+expected);
function nearVector(actual,expected){for(let i=0;i<3;i++)near(actual[i],expected[i]);}
function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,844/390,.12,700),cockpit=new T.Group();scene.add(camera,cockpit);
 const surface=new T.Mesh(new T.PlaneGeometry(.5,.16),new T.MeshBasicMaterial());surface.position.set(.4,.25,-1);cockpit.add(surface);
 const hidden=new T.Group(),visibleExtra=new T.Group();hidden.visible=false;scene.add(hidden,visibleExtra);
 let target=null,viewport=new T.Vector4(3,4,844,390),scissor=new T.Vector4(8,9,800,300),scissorTest=true,renderCount=0,fail=false,overlay,lastRearTarget;
 const renderer={autoClear:false,info:{render:{calls:42,triangles:1000}},getRenderTarget:()=>target,setRenderTarget:v=>{target=v;if(v)lastRearTarget=v;},getViewport:v=>v.copy(viewport),setViewport:(...v)=>viewport=v[0]?.isVector4?v[0].clone():new T.Vector4(...v),getScissor:v=>v.copy(scissor),setScissor:v=>scissor=v.clone(),getScissorTest:()=>scissorTest,setScissorTest:v=>scissorTest=v,render(){assert.equal(cockpit.visible,false);assert.equal(hidden.visible,false);assert.equal(overlay.visible,false,'portrait HUD must not render itself in the rear pass');renderCount++;if(fail)throw Error('test render failed');},readRenderTargetPixels(){}};
 const mirror=createRearView({renderer,scene,camera,cockpit,surface});overlay=camera.getObjectByName('portrait-rear-view-hud');
 return{mirror,camera,cockpit,surface,hidden,visibleExtra,overlay,renderer,get rearTarget(){return lastRearTarget;},get state(){return{target,viewport:viewport.toArray(),scissor:scissor.toArray(),scissorTest,renderCount}},setFail:(value=true)=>fail=value};
}
function setViewport(f,width,height){f.camera.aspect=width/height;f.camera.updateProjectionMatrix();return{portrait:height>width,viewportWidth:width,viewportHeight:height};}
function checkPortraitBounds(bounds,width,height){
 for(const value of Object.values(bounds))assert.ok(Number.isFinite(value));
 assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=1&&bounds.y+bounds.height<=1,'portrait mirror must stay inside the screen');
 near(bounds.x*width,12);near(bounds.y*height,88);near(bounds.width*width,148);near(bounds.height*height,37);
}

test('rear view looks behind the vehicle and mirrors its render texture, for every heading',()=>{
 const f=fixture();
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){f.camera.position.set(3,1,8);f.mirror.update({player:{heading},enabled:true,force:true});const s=f.mirror.stats();assert.ok(new T.Vector3(...s.direction).dot(new T.Vector3(Math.sin(heading),0,Math.cos(heading)))<-.999);assert.ok(s.bounds.width>0&&s.bounds.height>0);}
 assert.equal(f.surface.material.map.repeat.x,-1);assert.equal(f.surface.material.map.offset.x,1);assert.equal(f.surface.material.toneMapped,false);assert.equal(f.surface.material.map.generateMipmaps,false);f.mirror.dispose();
});
test('rear camera follows the physical mirror world position independently of the driver gaze',()=>{
 const f=fixture(),heading=1.2,args={player:{heading},enabled:true,force:true};
 f.cockpit.position.set(13,.6,-9);f.cockpit.rotation.set(.04,heading,-.03);
 f.camera.position.set(12,1.5,-8);f.camera.lookAt(25,1.2,3);
 f.mirror.update(args);const first=f.mirror.stats(),expected=f.surface.getWorldPosition(new T.Vector3()).toArray();
 nearVector(first.camera,expected);nearVector(first.surfaceWorld,expected);
 assert.ok(new T.Vector3(...first.camera).distanceTo(f.camera.position)>.1,'rear camera must not sit at the driver eye');
 f.camera.rotation.y+=.4;f.mirror.update(args);const glanced=f.mirror.stats();
 nearVector(glanced.camera,first.camera);nearVector(glanced.direction,first.direction);
 f.cockpit.position.add(new T.Vector3(-4,.2,6));f.cockpit.rotation.y+=.3;
 f.mirror.update({...args,player:{heading:heading+.3}});const moved=f.mirror.stats();
 nearVector(moved.camera,f.surface.getWorldPosition(new T.Vector3()).toArray());
 assert.ok(new T.Vector3(...moved.camera).distanceTo(new T.Vector3(...first.camera))>1);f.mirror.dispose();
});
test('rear view caps its cadence and stops while paused or outside the cockpit',()=>{
 const f=fixture(),args={player:{heading:0},enabled:true};f.mirror.update({...args,now:0});f.mirror.update({...args,now:20});assert.equal(f.mirror.stats().frames,1);f.mirror.update({...args,now:50});assert.equal(f.mirror.stats().frames,2);f.mirror.update({...args,now:1000,paused:true});assert.equal(f.mirror.stats().frames,2);f.mirror.update({...args,enabled:false,now:1100});assert.equal(f.mirror.stats().active,false);f.mirror.update({...args,now:1101});assert.equal(f.mirror.stats().frames,3);f.mirror.dispose();
});
test('portrait HUD shares one rear render texture and stays inside different phone viewports',()=>{
 const f=fixture(),args={player:{heading:0},enabled:true,force:true};f.camera.fov=42.38617142;f.camera.near=.035;
 for(const [index,[width,height]] of [[390,844],[360,640],[320,568]].entries()){
  f.mirror.update({...args,...setViewport(f,width,height)});const s=f.mirror.stats();
  assert.equal(s.presentation,'portrait-overlay');assert.equal(f.overlay.visible,true);assert.equal(f.overlay.parent,f.camera);
  checkPortraitBounds(s.bounds,width,height);
  const display=f.overlay.children.find(object=>object.material.map);
  assert.equal(display.material.map,f.surface.material.map,'physical mirror and HUD must share their existing texture');
  assert.equal(f.state.renderCount,index+1,'HUD must not cause another offscreen render');
  nearVector(s.camera,s.surfaceWorld);
 }
 f.mirror.dispose();
});
test('paused viewport rotation updates HUD layout without rendering and inactive mirrors hide it',()=>{
 const f=fixture(),args={player:{heading:0},enabled:true};
 f.mirror.update({...args,...setViewport(f,844,390),now:0});assert.equal(f.overlay.visible,false);
 f.mirror.update({...args,...setViewport(f,390,844),paused:true,now:1000});
 assert.equal(f.state.renderCount,1);assert.equal(f.overlay.visible,true);checkPortraitBounds(f.mirror.stats().bounds,390,844);
 f.mirror.update({...args,...setViewport(f,360,640),paused:true,now:1100});
 assert.equal(f.state.renderCount,1);checkPortraitBounds(f.mirror.stats().bounds,360,640);
 f.mirror.update({...args,...setViewport(f,844,390),paused:true,now:1200});
 assert.equal(f.overlay.visible,false);assert.equal(f.mirror.stats().presentation,'physical');assert.equal(f.state.renderCount,1);
 f.mirror.update({...args,...setViewport(f,390,844),now:1300});assert.equal(f.overlay.visible,true);assert.equal(f.state.renderCount,2);
 f.mirror.update({...args,...setViewport(f,390,844),enabled:false,now:1400});
 assert.equal(f.overlay.visible,false);assert.equal(f.mirror.stats().active,false);assert.equal(f.state.renderCount,2);
 f.mirror.update({...args,...setViewport(f,390,844),player:null,now:1500});
 assert.equal(f.overlay.visible,false);assert.equal(f.state.renderCount,2);f.mirror.dispose();
});
test('rear pass restores both visible and hidden objects and renderer state after success or failure',()=>{
 for(const fail of [false,true]){
  const f=fixture();f.setFail(fail);const args={player:{heading:0},enabled:true,hide:[f.hidden,f.visibleExtra],...setViewport(f,390,844)};
  const render=f.renderer.render;f.renderer.render=function(...parameters){assert.equal(f.visibleExtra.visible,false);return render.apply(this,parameters);};
  if(fail)assert.throws(()=>f.mirror.update(args),/test render failed/);else f.mirror.update(args);
  assert.equal(f.cockpit.visible,true);assert.equal(f.hidden.visible,false);assert.equal(f.visibleExtra.visible,true);assert.equal(f.overlay.visible,true);
  assert.equal(f.renderer.autoClear,false);assert.deepEqual(f.state,{target:null,viewport:[3,4,844,390],scissor:[8,9,800,300],scissorTest:true,renderCount:1});f.mirror.dispose();
 }
});
test('sustained slow frames reduce mirror cost, and disposal releases shared resources once',()=>{
 const f=fixture();for(let i=0;i<100;i++)f.mirror.update({player:{heading:0},enabled:true,now:i*50,frameMs:45,...setViewport(f,390,844)});
 const s=f.mirror.stats();assert.equal(s.width,288);assert.equal(s.height,72);assert.equal(s.hz,12);assert.equal(s.quality,'economy');
 const resources=new Set([f.rearTarget,...f.overlay.children.flatMap(object=>[object.geometry,object.material])]),disposed=new Map();
 for(const resource of resources){disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));}
 const frames=s.frames;f.mirror.dispose();f.mirror.dispose();f.mirror.update({player:{heading:0},enabled:true,force:true});
 assert.equal(f.surface.material.map,null);assert.equal(f.overlay.parent,null);assert.equal(f.mirror.stats().frames,frames);assert.equal(f.mirror.stats().disposed,true);
 assert.equal(f.mirror.stats().active,false);for(const count of disposed.values())assert.equal(count,1);
});
