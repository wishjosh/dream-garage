import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {loadFerrari} from '../ferrari-city/asset.mjs?v=ferrari-city-2';
import {createReferencePaint} from '../vehicle-compare/ferrari-reference.mjs';

const base=new URL('../../assets/vehicle-compare/porsche-911/',import.meta.url);
const pending=new Map();
let shared;
export async function loadShared(){return shared??=loadFerrari();}
function wrapWheels(root){
 for(const key of ['fl','fr','rl','rr']){
  const wheel=root.getObjectByName('wheel_'+key),pivot=new T.Group();pivot.name='steer_'+key;pivot.position.copy(wheel.position);wheel.parent.add(pivot);pivot.add(wheel);wheel.position.set(0,0,0);
 }
}
function prepareMaterials(root,kind){
 const paint=createReferencePaint();paint.name='study-body';const rims=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const name=o.material.name;
  if(kind==='porsche'&&name==='body_main'||kind==='ferrari'&&o.name==='body')o.material=paint;
  if(kind==='porsche'&&o.name.startsWith('wheel_rim_')||kind==='ferrari'&&o.name.startsWith('rim_')){
   const source=o.material;if(!rims.has(source)){const m=source.clone();m.userData.stockColor=m.color.getHex();m.userData.studyRim=true;rims.set(source,m);}o.material=rims.get(source);
  }
 });
}
async function compressedGLB(url,onProgress,total){
 const response=await fetch(url);if(!response.ok)throw Error('차량 파일을 받지 못했습니다 ('+response.status+').');
 if(!('DecompressionStream' in window))throw Error('압축 차량을 열 수 있도록 브라우저를 업데이트해 주세요.');
 const reader=response.body.getReader();let bytes=0;
 const stream=new ReadableStream({async pull(controller){try{const {done,value}=await reader.read();if(done){controller.close();return;}bytes+=value.byteLength;onProgress?.(Math.min(100,Math.round(bytes/total*100)));controller.enqueue(value);}catch(e){controller.error(e);}},cancel:reason=>reader.cancel(reason)});
 const buffer=await new Response(stream.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return new GLTFLoader().parseAsync(buffer,base.href);
}
export function loadTemplate(key,onProgress){
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{const start=performance.now();
  if(key==='ferrari'){
   const f=await loadShared(),source=f.source.clone(true);source.updateMatrixWorld(true);source.attach(source.getObjectByName('steering_column'));source.updateMatrixWorld(true);
   const matrix=new T.Matrix4().compose(f.offset,new T.Quaternion(),new T.Vector3(f.scale,f.scale,f.scale)),root=new T.Group(),membership=new Map(),centers={};
   for(const id of ['fl','fr','rl','rr']){const node=source.getObjectByName('wheel_'+id),position=node.getWorldPosition(new T.Vector3()).applyMatrix4(matrix);centers[id]=position.toArray();node.traverse(o=>membership.set(o,'wheel_'+id));}
   const steering=source.getObjectByName('steering_wheel'),center=steering.getWorldPosition(new T.Vector3()).applyMatrix4(matrix),axis=new T.Vector3(0,1,0).applyQuaternion(steering.getWorldQuaternion(new T.Quaternion())).normalize();steering.traverse(o=>membership.set(o,'steering_wheel'));
   const groups=new Map();for(const id of ['fl','fr','rl','rr']){const group=new T.Group();group.name='wheel_'+id;group.position.fromArray(centers[id]);root.add(group);groups.set(group.name,group);}const steer=new T.Group();steer.name='steering_wheel';steer.position.copy(center);root.add(steer);groups.set(steer.name,steer);
   source.traverse(o=>{if(!o.isMesh)return;const key=membership.get(o),parent=groups.get(key)||root,geometry=o.geometry.clone().applyMatrix4(matrix.clone().multiply(o.matrixWorld));geometry.translate(-parent.position.x,-parent.position.y,-parent.position.z);const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;parent.add(mesh);});
   prepareMaterials(root,'ferrari');wrapWheels(root);
   return{key,root,eye:new T.Vector3(-.346,1.055,.16).multiplyScalar(f.scale).add(f.offset),axis,centers,length:4.527,bytes:1681572,loadMs:performance.now()-start,triangles:358788,materialCount:17};
  }
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('차량 구성 정보를 받지 못했습니다.');const manifest=await response.json(),variant=manifest.variants.find(v=>v.file.includes(key==='porsche'?'mobile':'reference'));
  const gltf=await compressedGLB(new URL(variant.file,base),onProgress,variant.bytes),root=gltf.scene;prepareMaterials(root,'porsche');wrapWheels(root);
  return{key,root,eye:new T.Vector3().fromArray(manifest.eye),axis:new T.Vector3().fromArray(manifest.steeringAxis),centers:manifest.wheelCenters,length:manifest.lengthMetres,bytes:variant.bytes,decodedBytes:variant.decodedBytes,loadMs:performance.now()-start,triangles:manifest.sourceTriangles,materialCount:37,manifest,variant};
 })();pending.set(key,task);task.catch(()=>pending.delete(key));return task;
}
export function makeActor(template){
 const root=template.root.clone(true),wheels=['fl','fr','rl','rr'].map(key=>({key,wheel:root.getObjectByName('wheel_'+key),pivot:root.getObjectByName('steer_'+key),brake:root.getObjectByName('brake_'+key)})),steering=root.getObjectByName('steering_wheel');
 const baseline=[];root.traverse(o=>{if(o.isMesh)baseline.push({mesh:o,geometry:o.geometry,version:o.geometry.attributes.position.version});});
 return{root,wheels,steering,template,baseline};
}
export function appearance(actor,color,rim){
 actor.root.traverse(o=>{if(!o.isMesh)return;if(o.material.name==='study-body')o.material.color.set(color);if(o.material.userData.studyRim)o.material.color.setHex(rim==='stock'?o.material.userData.stockColor:new T.Color(rim).getHex());});
}
export function pose(actor,amount,roll){
 for(const w of actor.wheels){const yaw=w.key[0]==='f'?-amount*.48:0;w.pivot.rotation.y=yaw;w.wheel.rotation.x=-roll;if(w.brake)w.brake.rotation.y=yaw;}
 actor.steering.quaternion.setFromAxisAngle(actor.template.axis,amount*1.92);
}
export function isolate(actor,mode){
 actor.root.traverse(o=>{if(!o.isMesh)return;let n=o,group=null;while(n&&n!==actor.root){if(n.name==='steering_wheel'||n.name.startsWith('wheel_'))group=n.name;n=n.parent;}o.visible=mode==='wheels'?group?.startsWith('wheel_')===true:mode==='steering'?group==='steering_wheel':true;});
}
