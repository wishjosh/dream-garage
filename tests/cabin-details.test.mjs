import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {CABIN_DIALS,dialNeedleAngle,finishCabinMaterials} from '../dist/cabin-details.mjs';

test('source finishing preserves every part transform and geometry while separating leather and metal',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(1,2,3),leather=new T.MeshStandardMaterial({name:'study_leder_black',color:'#888888'}),metal=new T.MeshStandardMaterial({name:'study_Antisorp_Chrome',color:'#888888'});
 const a=new T.Mesh(geometry,leather),b=new T.Mesh(geometry,metal);root.add(a,b);a.position.set(3,2,1);b.rotation.y=.4;
 const before=[a,b].map(o=>({position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),geometry:o.geometry,version:o.geometry.attributes.position.version}));
 assert.equal(finishCabinMaterials(root),2);
 for(const [i,o]of [a,b].entries()){assert.ok(o.position.equals(before[i].position));assert.ok(o.quaternion.equals(before[i].quaternion));assert.ok(o.scale.equals(before[i].scale));assert.equal(o.geometry,before[i].geometry);assert.equal(o.geometry.attributes.position.version,before[i].version);}
 assert.ok(leather.color.getHex()!==metal.color.getHex());assert.ok(leather.roughness>metal.roughness);assert.ok(metal.metalness>leather.metalness);
 geometry.dispose();leather.dispose();metal.dispose();
});
test('physical dial needles advance clockwise, clamp safely and retain the source cluster placement',()=>{
 for(const max of [8,240]){assert.ok(dialNeedleAngle(0,max)>dialNeedleAngle(max/2,max));assert.ok(dialNeedleAngle(max/2,max)>dialNeedleAngle(max,max));assert.equal(dialNeedleAngle(-10,max),dialNeedleAngle(0,max));assert.equal(dialNeedleAngle(max*10,max),dialNeedleAngle(max,max));assert.equal(dialNeedleAngle(NaN,max),dialNeedleAngle(0,max));}
 assert.deepEqual(CABIN_DIALS.map(d=>d.name),['rpm','speed','oil','temp','volts']);
 assert.ok(CABIN_DIALS[0].center[0]<-.4&&CABIN_DIALS[1].center[0]>-.4);
 assert.ok(CABIN_DIALS.every(d=>d.radius>0&&d.radius<.04&&d.center[2]<-.7));
});
