import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createRearView} from '../dist/rear-view.mjs';

function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,844/390,.12,700),cockpit=new T.Group();camera.add(cockpit);scene.add(camera);
 const surface=new T.Mesh(new T.PlaneGeometry(.5,.16),new T.MeshBasicMaterial());surface.position.set(.4,.25,-1);cockpit.add(surface);
 const hidden=new T.Group();hidden.visible=false;scene.add(hidden);
 let target=null,viewport=new T.Vector4(3,4,844,390),scissor=new T.Vector4(8,9,800,300),scissorTest=true,renderCount=0,fail=false;
 const renderer={autoClear:false,info:{render:{calls:42,triangles:1000}},getRenderTarget:()=>target,setRenderTarget:v=>target=v,getViewport:v=>v.copy(viewport),setViewport:(...v)=>viewport=v[0]?.isVector4?v[0].clone():new T.Vector4(...v),getScissor:v=>v.copy(scissor),setScissor:v=>scissor=v.clone(),getScissorTest:()=>scissorTest,setScissorTest:v=>scissorTest=v,render(){assert.equal(cockpit.visible,false);assert.equal(hidden.visible,false);renderCount++;if(fail)throw Error('test render failed');},readRenderTargetPixels(){}};
 const mirror=createRearView({renderer,scene,camera,cockpit,surface});
 return{mirror,camera,cockpit,surface,hidden,renderer,get state(){return{target,viewport:viewport.toArray(),scissor:scissor.toArray(),scissorTest,renderCount}},setFail:()=>fail=true};
}
test('rear view looks behind the vehicle and mirrors its render texture, for every heading',()=>{
 const f=fixture();
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){f.camera.position.set(3,1,8);f.mirror.update({player:{heading},enabled:true,force:true});const s=f.mirror.stats();assert.ok(new T.Vector3(...s.direction).dot(new T.Vector3(Math.sin(heading),0,Math.cos(heading)))<-.999);assert.ok(s.bounds.width>0&&s.bounds.height>0);}
 assert.equal(f.surface.material.map.repeat.x,-1);assert.equal(f.surface.material.map.offset.x,1);assert.equal(f.surface.material.toneMapped,false);assert.equal(f.surface.material.map.generateMipmaps,false);f.mirror.dispose();
});
test('rear view caps its cadence and stops while paused or outside the cockpit',()=>{
 const f=fixture(),args={player:{heading:0},enabled:true};f.mirror.update({...args,now:0});f.mirror.update({...args,now:20});assert.equal(f.mirror.stats().frames,1);f.mirror.update({...args,now:50});assert.equal(f.mirror.stats().frames,2);f.mirror.update({...args,now:1000,paused:true});assert.equal(f.mirror.stats().frames,2);f.mirror.update({...args,enabled:false,now:1100});assert.equal(f.mirror.stats().active,false);f.mirror.update({...args,now:1101});assert.equal(f.mirror.stats().frames,3);f.mirror.dispose();
});
test('rear pass restores visibility and renderer state even when rendering fails',()=>{
 const f=fixture();f.setFail();assert.throws(()=>f.mirror.update({player:{heading:0},enabled:true,hide:[f.hidden]}),/test render failed/);assert.equal(f.cockpit.visible,true);assert.equal(f.hidden.visible,false);assert.equal(f.renderer.autoClear,false);assert.deepEqual(f.state,{target:null,viewport:[3,4,844,390],scissor:[8,9,800,300],scissorTest:true,renderCount:1});f.mirror.dispose();
});
test('sustained slow frames reduce mirror cost, and disposal releases the render target once',()=>{
 const f=fixture();for(let i=0;i<100;i++)f.mirror.update({player:{heading:0},enabled:true,now:i*50,frameMs:45});const s=f.mirror.stats();assert.equal(s.width,288);assert.equal(s.height,72);assert.equal(s.hz,12);assert.equal(s.quality,'economy');const frames=s.frames;f.mirror.dispose();f.mirror.dispose();f.mirror.update({player:{heading:0},enabled:true,force:true});assert.equal(f.surface.material.map,null);assert.equal(f.mirror.stats().frames,frames);assert.equal(f.mirror.stats().disposed,true);
});
