import * as T from './vendor/three.module.js';

// Wheel roots use local X as the axle. Calipers follow suspension/steering only.
export function splitWheelVisuals(body,rig){
 const wheels=[],calipers=[];body.updateWorldMatrix(true,true);
 for(const info of rig.wheels){
  const wheel=body.getObjectByName(info.name);if(!wheel)throw Error('Missing '+info.name);
  const fixed=new T.Group();fixed.name=info.name+'_caliper';const parts=[];
  wheel.traverse(mesh=>{if(mesh.isMesh&&!Array.isArray(mesh.material)&&mesh.material.name==='Brake')parts.push(mesh);});
  const inverse=new T.Matrix4().copy(wheel.matrixWorld).invert();
  for(const part of parts){const local=new T.Matrix4().multiplyMatrices(inverse,part.matrixWorld);part.removeFromParent();local.decompose(part.position,part.quaternion,part.scale);fixed.add(part);}
  wheel.removeFromParent();wheel.position.set(0,0,0);wheels.push(wheel);calipers.push(fixed);
 }
 return {wheels,calipers};
}
export function syncWheelVisuals(wheels,calipers,poses){
 for(let j=0;j<wheels.length;j++){
  const pose=poses?.[j];if(!pose)continue;
  wheels[j].position.fromArray(pose.position);wheels[j].quaternion.fromArray(pose.visualQuaternion||pose.quaternion);
  calipers[j].position.fromArray(pose.position);calipers[j].quaternion.fromArray(pose.steeringQuaternion||pose.quaternion);
 }
}
