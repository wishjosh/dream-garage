import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {prepareRaceVisual,createMirrorSchedule} from '../dist/race-rendering.mjs';

test('opaque batching preserves transformed vertices, source geometry and animated steering',()=>{
 const body=new T.Group(),material=new T.MeshStandardMaterial(),source=new T.BoxGeometry(1,2,3),initial=source.attributes.position.array.slice();
 const a=new T.Mesh(source,material),nested=new T.Group(),b=new T.Mesh(source,material),steer=new T.Group(),rim=new T.Mesh(source,material);
 a.position.x=2;nested.position.set(0,1,3);nested.rotation.y=.4;nested.add(b);steer.name='steering_wheel';steer.add(rim);body.add(a,nested,steer);
 body.updateMatrixWorld(true);const expected=[];for(const m of [a,b])for(let i=0;i<source.attributes.position.count;i++)expected.push(...new T.Vector3().fromBufferAttribute(source.attributes.position,i).applyMatrix4(m.matrixWorld).toArray());
 const optimized=prepareRaceVisual({body,opponent:true}),batch=body.getObjectByName('race-batch');assert.ok(batch);assert.equal(optimized.stats().removedDraws,1);assert.equal(rim.visible,true);assert.deepEqual(source.attributes.position.array,initial);
 const actual=batch.geometry.attributes.position.array;assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-6);
 assert.equal(a.visible,false);optimized.setOptimized(false);assert.equal(a.visible,true);assert.equal(batch.visible,false);optimized.setOptimized(true);assert.equal(a.visible,false);
 optimized.dispose();optimized.dispose();assert.equal(a.visible,true);assert.equal(batch.parent,null);
});
test('race glass is a private copy and disposal never disposes original materials or textures',()=>{
 const body=new T.Group(),glass=new T.MeshPhysicalMaterial({transmission:1}),paint=new T.MeshPhysicalMaterial({color:0xff0000,clearcoat:1}),geometry=new T.BoxGeometry();
 let originalDisposed=0;glass.addEventListener('dispose',()=>originalDisposed++);paint.addEventListener('dispose',()=>originalDisposed++);
 const window=new T.Mesh(geometry,glass),shell=new T.Mesh(geometry,paint);body.add(window,shell);const optimized=prepareRaceVisual({body});assert.notEqual(window.material,glass);assert.equal(window.material.transmission,undefined);assert.equal(glass.transmission,1);assert.equal(shell.material,paint);assert.equal(optimized.stats().batchedGroups,0);
 optimized.dispose();assert.equal(window.material,glass);assert.equal(originalDisposed,0);
});
test('wheel and caliper batches remain separate and transparent parts are not merged',()=>{
 const body=new T.Group(),wheel=new T.Group(),caliper=new T.Group(),mat=new T.MeshStandardMaterial(),clear=new T.MeshStandardMaterial({transparent:true});
 for(const root of [body,wheel,caliper])for(let i=0;i<2;i++)root.add(new T.Mesh(new T.BoxGeometry(),mat));
 body.add(new T.Mesh(new T.BoxGeometry(),clear),new T.Mesh(new T.BoxGeometry(),clear));
 const opt=prepareRaceVisual({body,wheels:[wheel],calipers:[caliper],opponent:true});assert.equal(opt.stats().batchedGroups,3);assert.equal(opt.stats().removedDraws,3);assert.equal(wheel.getObjectByName('race-batch').parent,wheel);assert.equal(caliper.getObjectByName('race-batch').parent,caliper);opt.dispose();
});
test('one due mirror per frame rotates fairly while forced refresh and comparison retain all passes',()=>{
 const counts=[0,0,0],views=counts.map((_,i)=>({update(a){if(a.force||!a.canRender||a.canRender())counts[i]++;}})),schedule=createMirrorSchedule();
 for(let i=0;i<6;i++)schedule.run(views,{});assert.deepEqual(counts,[2,2,2]);schedule.run(views,{},{force:true});assert.deepEqual(counts,[3,3,3]);schedule.run(views,{},{optimized:false});assert.deepEqual(counts,[4,4,4]);
});

test('batching decodes quantized positions and preserves reflected front faces',()=>{
 const body=new T.Group(),mat=new T.MeshStandardMaterial(),g=new T.BufferGeometry();
 g.setAttribute('position',new T.BufferAttribute(new Uint16Array([0,0,0,65535,0,0,0,65535,0]),3,true));g.setIndex([0,1,2]);
 const a=new T.Mesh(g,mat),b=new T.Mesh(g,mat);a.position.x=-4;b.scale.x=-1;body.add(a,b);const opt=prepareRaceVisual({body,opponent:true}),batch=body.getObjectByName('race-batch');
 assert.deepEqual(Array.from(batch.geometry.attributes.position.array),[-4,0,0,-3,0,0,-4,1,0,0,0,0,-1,0,0,0,1,0]);assert.deepEqual(Array.from(batch.geometry.index.array),[0,1,2,3,5,4]);assert.equal(g.attributes.position.normalized,true);opt.dispose();
});
