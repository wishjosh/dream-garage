import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import * as T from '../dist/vendor/three.module.js';
import {preparePorscheExterior,setPorscheSteering} from '../dist/studies/mixed-city/rig.mjs';
import {splitWheelVisuals,syncWheelVisuals} from '../dist/wheel-visual.mjs';
import {vehicleConfig,RacePhysics} from '../dist/race-handling.mjs';
import {createCityCourse} from '../dist/city-course.mjs';
import {RacePhysics as MixedPhysics} from '../dist/studies/mixed-city/physics.mjs';
import {makeRacer,finishRacer} from '../dist/race-core.mjs';
import {normalizeSave,transact,tuning} from '../dist/studies/mixed-city/core.mjs';
import {profilesFor,summarize} from '../dist/studies/mixed-city/measure.mjs';
const dir=new URL('../dist/studies/mixed-city/',import.meta.url);
async function source(){
 const b=gunzipSync(await readFile(new URL('../dist/assets/vehicle-compare/porsche-911/porsche-mobile.glb.gz',import.meta.url))),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length)),offset=28+length;
 const manifest=JSON.parse(await readFile(new URL('../dist/assets/vehicle-compare/porsche-911/manifest.json',import.meta.url)));
 function attr(index){const a=j.accessors[index],v=j.bufferViews[a.bufferView],C={5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType],size={SCALAR:1,VEC3:3}[a.type],bytes=b.subarray(offset+(v.byteOffset||0)+(a.byteOffset||0),offset+(v.byteOffset||0)+(a.byteOffset||0)+a.count*size*C.BYTES_PER_ELEMENT);return new T.BufferAttribute(new C(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),size,!!a.normalized);}
 const nodes=j.nodes.map(n=>{let o;if(n.mesh!==undefined){const p=j.meshes[n.mesh].primitives[0],g=new T.BufferGeometry();g.setAttribute('position',attr(p.attributes.POSITION));g.setIndex(attr(p.indices));o=new T.Mesh(g,new T.MeshBasicMaterial({name:j.materials[p.material].name}));}else o=new T.Group();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 j.nodes.forEach((n,i)=>{for(const child of n.children||[])nodes[i].add(nodes[child]);});const root=new T.Group();for(const id of j.scenes[j.scene||0].nodes)root.add(nodes[id]);
 // The shared loader wraps wheel groups for steering without changing geometry.
 for(const id of ['fl','fr','rl','rr']){const w=root.getObjectByName('wheel_'+id),pivot=new T.Group();pivot.name='steer_'+id;pivot.position.copy(w.position);w.parent.add(pivot);pivot.add(w);w.position.set(0,0,0);}
 root.updateMatrixWorld(true);return{root,centers:manifest.wheelCenters,manifest};
}
test('Porsche integration preserves real quantized geometry before and after physics wheel splitting',async()=>{
 const template=await source(),expected=new Map(),flip=new T.Matrix4().makeRotationY(Math.PI);let triangles=0;
 template.root.traverse(o=>{if(!o.isMesh)return;triangles+=o.geometry.index.count/3;expected.set(o.geometry,{matrix:flip.clone().multiply(o.matrixWorld),version:o.geometry.attributes.position.version});});
 const {exterior,rig}=preparePorscheExterior(template);const check=()=>{exterior.updateMatrixWorld(true);let count=0;exterior.traverse(o=>{if(!o.isMesh)return;count++;const e=expected.get(o.geometry),p=o.geometry.attributes.position;assert.ok(e,'reuse original geometry');assert.equal(p.version,e.version);for(const i of [0,Math.floor(p.count/2),p.count-1]){const v=new T.Vector3().fromBufferAttribute(p,i);assert.ok(v.clone().applyMatrix4(e.matrix).distanceTo(v.applyMatrix4(o.matrixWorld))<1e-6,o.name);}});assert.equal(count,expected.size);};
 assert.equal(triangles,423947);check();const split=splitWheelVisuals(exterior,rig);split.wheels.forEach(w=>exterior.add(w));split.calipers.forEach(w=>exterior.add(w));syncWheelVisuals(split.wheels,split.calipers,rig.wheels.map(w=>({position:w.position,quaternion:[0,0,0,1]})));check();
 assert.deepEqual(split.calipers.map(c=>c.children.length),[2,2,2,2]);assert.ok(rig.wheels[0].position[0]>0&&rig.wheels[0].position[2]>0,'front-left in +Z game coordinates');
});
test('Porsche uses road-car physics, with exactly two of each kind and no formula tuning',async()=>{
 assert.deepEqual(vehicleConfig('porsche'),vehicleConfig('tavaculo'));const t=await source(),{rig}=preparePorscheExterior(t),track=createCityCourse();
 for(const selected of ['tavaculo','porsche']){const racers=[makeRacer(track,{car:selected}),...[0,1,2].map((i)=>makeRacer(track,{id:'b'+i,car:i===1?selected:selected==='tavaculo'?'porsche':'tavaculo',s:7+i*7,lane:i%2?-2.3:2.3}))];assert.equal(racers.filter(r=>r.car==='porsche').length,2);const physics=new RacePhysics(track,racers,{tavaculo:rig,porsche:rig},{barriers:false});for(let i=0;i<120;i++)physics.step(1/60,{throttle:true},true);assert.ok(racers.every(r=>Number.isFinite(r.x)&&r.wheels.length===4));assert.deepEqual(physics.entries[0].config,physics.entries[1].config);physics.dispose();}
 const save=normalizeSave({version:1,owned:['paint-mint']});assert.ok(transact(save,'porsche','paint-mint').ok);assert.equal(save.garage.porsche.paint,'paint-mint');assert.equal(save.garage.tavaculo.paint,'paint-stock');assert.deepEqual(tuning(save,'porsche'),tuning(save,'tavaculo'));
});
test('Porsche tilted wheel moves toward the driver left/right at different headings',async()=>{
 const {manifest:m}=await source(),axis=new T.Vector3().fromArray(m.steeringAxis),top=new T.Vector3(0,1,0).addScaledVector(axis,-axis.y).normalize().multiplyScalar(.16);
 for(const heading of [0,Math.PI/2,Math.PI]){const root=new T.Group(),wheel=new T.Group();wheel.name='steering_wheel';wheel.position.fromArray(m.steeringCenter);root.add(wheel);root.rotation.y=heading+Math.PI;root.updateMatrixWorld(true);const eye=root.localToWorld(new T.Vector3().fromArray(m.eye)),target=root.localToWorld(new T.Vector3(m.eye[0],m.eye[1]-.045,m.eye[2]-1)),camera=new T.PerspectiveCamera(58,844/390,.025,700);camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld(true);const project=()=>{root.updateMatrixWorld(true);return wheel.localToWorld(top.clone()).project(camera).x;};setPorscheSteering(root,axis,0);const centre=project();for(const amount of [-1,1]){setPorscheSteering(root,axis,amount);assert.ok((project()-centre)*amount>.02);}setPorscheSteering(root,axis,0);assert.equal(project(),centre);}
});
test('measurement order contains identical four cases and reports frame cadence correctly',()=>{
 const normal=profilesFor(),reverse=profilesFor(true);assert.equal(normal.length,4);assert.deepEqual(normal.map(p=>p.car+':'+p.view).sort(),reverse.map(p=>p.car+':'+p.view).sort());assert.notEqual(normal[0].car,reverse[0].car);assert.equal(summarize(Array(300).fill(1000/60)).over33ms,0);assert.ok(Math.abs(summarize(Array(300).fill(1000/60)).averageFps-60)<1e-10);assert.equal(summarize([16,34,50]).over33ms,2);
});
test('mixed study entire import graph has no persistence or transfer dependency',async()=>{
 const queue=[new URL('game.mjs',dir)],seen=new Set();while(queue.length){const url=queue.pop();url.search='';if(seen.has(url.href))continue;seen.add(url.href);assert.doesNotMatch(url.pathname,/save-transfer|original-cockpit/);const code=await readFile(url,'utf8');assert.doesNotMatch(code,/\b(?:localStorage|sessionStorage|indexedDB)\b/,url.pathname);for(const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))queue.push(new URL(match[1],url));}assert.ok(seen.size>20);
 const html=await readFile(new URL('index.html',dir),'utf8');assert.match(html,/data-car="porsche"/);assert.doesNotMatch(html,/<dialog id="save-transfer"/);
});

for(const selected of ['tavaculo','porsche'])test(selected+' mixed fleet completes the entire city without a permanently stalled rival',async()=>{
 const t=await source(),{rig}=preparePorscheExterior(t),track=createCityCourse(),racers=[makeRacer(track,{car:selected,lane:-2.3}),...[0,1,2].map(i=>makeRacer(track,{id:'bot'+i,car:i===1?selected:selected==='tavaculo'?'porsche':'tavaculo',s:7+i*7,lane:i%2?-2.3:2.3}))],p=new MixedPhysics(track,racers,{tavaculo:rig,porsche:rig},{autoRecovery:true});
 for(let i=0;i<180*120&&!racers.every(r=>r.finished);i++){p.step(1/120,racers[0].finished?{brake:1}:{...p.route(p.entries[0]),wheelCommand:true},true);racers.forEach(r=>finishRacer(r,track,i/120));}
 assert.ok(racers.every(r=>r.finished),JSON.stringify(racers.map(r=>({car:r.car,distance:r.distance,speed:r.speed}))));assert.ok(p.aiRecoveryCount>0,'regression case actually exercised bot recovery');assert.ok(p.aiRecoveryCount<10);p.dispose();
});
test('bot recovery preserves progress, adds no speed and leaves player physics unchanged',async()=>{
 const t=await source(),{rig}=preparePorscheExterior(t),track=createCityCourse(),racers=[makeRacer(track,{car:'porsche'}),makeRacer(track,{id:'bot',car:'tavaculo',s:400})],p=new MixedPhysics(track,racers,{tavaculo:rig,porsche:rig},{barriers:false});const original=p.drive.bind(p);p.drive=(e,input,assist)=>e.index?undefined:original(e,input,assist);
 const distance=racers[1].distance;for(let i=0;i<510;i++)p.step(1/120,{},false);assert.equal(p.aiRecoveryCount,1);assert.equal(racers[1].distance,distance);assert.equal(racers[1].speed,0);assert.equal(racers[0].speed,0);p.dispose();
});
