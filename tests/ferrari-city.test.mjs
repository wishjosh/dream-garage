import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarize} from '../dist/studies/ferrari-city/measure.mjs';

test('city timing reports stalls in the average and tail, not only median FPS',()=>{
 const r=summarize([...Array(19).fill(1000/60),100]);
 assert.equal(r.frames,20);assert.equal(r.over33ms,1);assert.equal(r.p95Ms,100);
 assert.ok(Math.abs(r.medianFps-60)<1e-10);assert.ok(Math.abs(r.averageFps-48)<1e-10);
 const empty=summarize([]);assert.equal(empty.averageFps,0);assert.equal(empty.frames,0);
});

test('the isolated city entry cannot reach the original save/import modules or browser storage',async()=>{
 const pending=[new URL('../dist/studies/ferrari-city/game.mjs',import.meta.url)],visited=new Set;
 while(pending.length){const url=pending.pop();url.search='';if(visited.has(url.href))continue;visited.add(url.href);
  assert.doesNotMatch(url.pathname,/save-transfer|original-cockpit|cockpit-source/);
  const code=await readFile(url,'utf8');assert.doesNotMatch(code,/\b(?:localStorage|sessionStorage|indexedDB)\b/,'Persistent storage in '+url.pathname);
  for(const m of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(m[1].startsWith('.'))pending.push(new URL(m[1],url));
 }
 assert.ok(visited.size>15,'Follow the game dependencies, not just its entry');
});


// Read the actual asset's tilted steering axis, then observe the rim from the
// driver's eye. A rotating wheel alone is insufficient: its direction matters.
import * as T from '../dist/vendor/three.module.js';
import {setFerrariSteering} from '../dist/studies/ferrari-city/cockpit.mjs';
import {createCar,stepCar,DT} from '../dist/handling-physics.mjs';
test('Ferrari rim turns toward driver left/right and returns to centre in forward and reverse',async()=>{
 const file=await readFile(new URL('../dist/assets/vehicle-compare/ferrari/ferrari.glb',import.meta.url));
 const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12))),node=gltf.nodes.find(n=>n.name==='steering_wheel');
 const base=new T.Quaternion().fromArray(node.rotation),wheel=new T.Object3D();wheel.position.fromArray(node.translation);
 const rimTop=new T.Vector3(0,1,0).applyQuaternion(base.clone().invert());rimTop.y=0;rimTop.normalize().multiplyScalar(.16);
 for(const heading of [0,Math.PI/2,Math.PI])for(const reverse of [false,true]){
  const frame=new T.Group();frame.rotation.y=heading+Math.PI;frame.add(wheel);frame.updateMatrixWorld(true);
  const eye=frame.localToWorld(new T.Vector3(-.346,1.055,.16)),target=frame.localToWorld(new T.Vector3(-.346,1.010,-.84));
  const camera=new T.PerspectiveCamera(58,844/390,.025,700);camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld(true);
  const projected=()=>{frame.updateMatrixWorld(true);return wheel.localToWorld(rimTop.clone()).project(camera).x;};
  setFerrariSteering(wheel,base,0);const centre=projected();
  for(const [direction,input,expected] of [['left',1,-1],['right',-1,1]]){
   const car=createCar();car.u=reverse?-3:3;
   for(let i=0;i<60;i++)stepCar(car,{steer:input,reverse},DT,{walls:false});
   setFerrariSteering(wheel,base,-car.steer/.46);
   assert.ok((projected()-centre)*expected>.02,`${direction}: rim must move toward driver's ${direction}, reverse=${reverse}, heading=${heading}`);
   for(let i=0;i<180;i++)stepCar(car,{steer:0,reverse},DT,{walls:false});
   setFerrariSteering(wheel,base,-car.steer/.46);assert.ok(Math.abs(projected()-centre)<.001,'released steering returns to centre');
  }
  setFerrariSteering(wheel,base,0);assert.deepEqual(wheel.quaternion.toArray(),base.toArray(),'reset preserves original tilt');
 }
});
