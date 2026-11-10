import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Race-only copies: the source, garage and original driver cabin stay untouched.
// Batch opaque rigid parts by material, preserving every vertex and wheel pivot.
function bakeGeometry(mesh,matrix){
 const g=mesh.geometry.clone();
 // Quantized GLTF attributes must be decoded before a transform is baked.
 for(const [name,attribute] of Object.entries(g.attributes)){
  const values=new Float32Array(attribute.count*attribute.itemSize);
  for(let i=0;i<attribute.count;i++)for(let j=0;j<attribute.itemSize;j++)values[i*attribute.itemSize+j]=attribute.getComponent(i,j);
  g.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize));
 }
 g.applyMatrix4(matrix);
 // A reflected hierarchy reverses front faces; retain that orientation after baking.
 if(matrix.determinant()<0){
  if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
  for(let i=0;i<g.index.count;i+=3){const b=g.index.getX(i+1);g.index.setX(i+1,g.index.getX(i+2));g.index.setX(i+2,b);}
  if(g.attributes.tangent)for(let i=0;i<g.attributes.tangent.count;i++)g.attributes.tangent.setW(i,-g.attributes.tangent.getW(i));
 }
 return g;
}
export function prepareRaceVisual({body,wheels=[],calipers=[],opponent=false}){
 const ownedGeometry=[],ownedMaterials=[],originals=[],batches=[];
 const glass=new Map();let disposed=false;
 for(const root of [body,...wheels,...calipers])root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material)||!(mesh.material.transmission>0))return;
  const source=mesh.material;
  if(!glass.has(source)){
   const material=new T.MeshStandardMaterial({name:source.name+'-race',color:source.color,metalness:source.metalness,roughness:Math.max(.08,source.roughness),envMap:source.envMap,envMapIntensity:source.envMapIntensity,transparent:true,opacity:.17,depthWrite:false,side:source.side});
   glass.set(source,material);ownedMaterials.push(material);
  }
  originals.push({mesh,material:source});mesh.material=glass.get(source);
 });
 if(opponent)for(const root of [body,...wheels,...calipers]){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();
  root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.visible||Array.isArray(mesh.material)||mesh.material.transparent||mesh.material.transmission>0||mesh.isSkinnedMesh||Object.keys(mesh.geometry.morphAttributes).length)return;
   // The exterior steering wheel remains animated separately.
   for(let n=mesh;n!==root;n=n.parent)if(!n.visible||n.name==='steering_wheel')return;
   if(mesh.geometry.drawRange.start!==0||mesh.geometry.drawRange.count!==Infinity)return;
   const shape=Object.entries(mesh.geometry.attributes).map(([k,a])=>[k,a.itemSize,a.normalized,a.array?.constructor.name].join(':')).sort().join('|');
   const key=mesh.material.uuid+'|'+shape+'|'+!!mesh.geometry.index;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  });
  for(const meshes of groups.values()){
   if(meshes.length<2)continue;
   const copies=meshes.map(mesh=>bakeGeometry(mesh,new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)));
   const geometry=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(!geometry)continue;
   geometry.computeBoundingSphere();const merged=new T.Mesh(geometry,meshes[0].material);merged.name='race-batch';
   root.add(merged);ownedGeometry.push(geometry);batches.push({merged,meshes});meshes.forEach(m=>m.visible=false);
  }
 }
 let optimized=true;
 return {setOptimized(value,{player=false}={}){optimized=!!value;for(const o of originals)o.mesh.material=optimized?glass.get(o.material):o.material;for(const b of batches){b.merged.visible=optimized&&!player;b.meshes.forEach(m=>m.visible=!(optimized&&!player));}},
  stats(){return{optimized,batchedGroups:batches.length,removedDraws:batches.reduce((n,b)=>n+b.meshes.length-1,0),glassMeshes:originals.length,geometryPreserved:true};},
  dispose(){if(disposed)return;this.setOptimized(false);for(const b of batches)b.merged.removeFromParent();ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());disposed=true;}
 };
}

// Allocate at most one due mirror pass each frame; rotate priority to avoid
// starving either side mirror when the rear mirror is due at the same instant.
export function createMirrorSchedule(){let cursor=0;return{run(views,args,{force=false,optimized=true}={}){
 let used=false;const take=()=>{if(used)return false;used=true;return true;};
 for(let j=0;j<views.length;j++)views[(j+cursor)%views.length].update({...args,force,canRender:optimized?take:undefined});
 cursor=(cursor+1)%Math.max(1,views.length);
}};}
