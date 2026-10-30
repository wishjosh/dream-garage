import * as T from '../../vendor/three.module.js';
export const IDS=['fl','fr','rl','rr'];
// Transform the source hierarchy, never its quantized vertex buffers.
export function preparePorscheExterior(template){
 const root=new T.Group(),source=template.root.clone(true);root.name='porsche-city-exterior';source.rotation.y=Math.PI;root.add(source);
 const wheels=IDS.map(id=>{
  const spin=source.getObjectByName('wheel_'+id),brake=source.getObjectByName('brake_'+id),group=new T.Group();group.name='wheel_'+id;
  const [x,y,z]=template.centers[id];group.position.set(-x,y,-z);
  spin.removeFromParent();spin.name='source-wheel-'+id;spin.position.set(0,0,0);spin.rotation.y=Math.PI;group.add(spin);
  brake.removeFromParent();brake.position.set(0,0,0);brake.rotation.y=Math.PI;
  const materials=new Map();brake.traverse(o=>{if(!o.isMesh)return;if(!materials.has(o.material)){const m=o.material.clone();m.name='Brake';materials.set(o.material,m);}o.material=materials.get(o.material);});group.add(brake);root.add(group);
  return{name:group.name,position:group.position.toArray(),front:id[0]==='f'};
 });
 return{exterior:root,rig:{radius:template.centers.fl[1],wheels}};
}
export function setPorscheSteering(root,axis,amount){root.getObjectByName('steering_wheel').quaternion.setFromAxisAngle(axis,Math.max(-1,Math.min(1,amount))*1.92);}
