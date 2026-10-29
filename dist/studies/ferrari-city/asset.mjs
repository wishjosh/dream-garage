import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {DRACOLoader} from '../vehicle-compare/DRACOLoader.js';
import {loadReferenceAssets,prepareFerrari} from '../vehicle-compare/ferrari-reference.mjs';
import {dressCar as originalDress,disposeDress,buildGarage} from '../../garage-visual.mjs';
import {itemById} from '../../garage-core.mjs';
export {disposeDress,buildGarage};
let pending;
export function loadFerrari(){
 return pending??=load();
}
async function load(){
 const decoder=new DRACOLoader().setDecoderPath(new URL('../vehicle-compare/draco/',import.meta.url).href).setDecoderConfig({type:'wasm'});
 const loader=new GLTFLoader().setDRACOLoader(decoder);
 try{
  const [gltf,assets]=await Promise.all([loader.loadAsync(new URL('../../assets/vehicle-compare/ferrari/ferrari.glb',import.meta.url).href),loadReferenceAssets()]);
  const source=prepareFerrari(gltf.scene.children[0]);source.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(source),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const scale=4.527/size.z,offset=new T.Vector3(-center.x,-bounds.min.y,-center.z).multiplyScalar(scale);
  const normal=new T.Matrix4().compose(offset,new T.Quaternion(),new T.Vector3(scale,scale,scale));
  const transform=new T.Matrix4().makeRotationY(Math.PI).multiply(normal);
  const exterior=new T.Group();exterior.name='ferrari-city-exterior';
  const wheelNodes=['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].map(name=>source.getObjectByName(name));
  const wheelMeshes=new Set;wheelNodes.forEach(w=>w.traverse(o=>wheelMeshes.add(o)));
  const bake=(o,matrix)=>{const mesh=new T.Mesh(o.geometry.clone().applyMatrix4(matrix),o.material);mesh.name=o.name;mesh.userData.ferrariSource=true;return mesh;};
  source.traverse(o=>{if(o.isMesh&&!wheelMeshes.has(o))exterior.add(bake(o,transform.clone().multiply(o.matrixWorld)));});
  const wheels=wheelNodes.map((node,i)=>{
   const position=node.getWorldPosition(new T.Vector3()).applyMatrix4(transform),group=new T.Group();group.name=node.name;group.position.copy(position);
   const local=new T.Matrix4().makeTranslation(-position.x,-position.y,-position.z).multiply(transform);
   node.traverse(o=>{if(o.isMesh)group.add(bake(o,local.clone().multiply(o.matrixWorld)));});exterior.add(group);
   return{name:node.name,position:position.toArray(),front:i<2};
  });
  const radius=new T.Box3().setFromObject(wheelNodes[0]).getSize(new T.Vector3()).y*scale/2;
  return{source,exterior,rig:{radius,wheels},scale,offset,assets,dimensions:size.multiplyScalar(scale).toArray()};
 }finally{decoder.dispose();}
}
export function dressCar(root,car,loadout,rig){
 if(car!=='tavaculo')return originalDress(root,car,loadout,rig);
 const paint=itemById(loadout.paint),wheel=itemById(loadout.wheels),owned=[];
 const body=root.getObjectByName('body');body.material=body.material.clone();body.material.color.set(paint?.color||'#ff0000');owned.push(body.material);
 for(const name of ['fl','fr','rl','rr']){const m=root.getObjectByName('rim_'+name);m.material=m.material.clone();m.material.color.set(wheel?.color||'#ffffff');owned.push(m.material);}
 root.userData.dreamOwned={materials:owned,geometry:[]};return root;
}
