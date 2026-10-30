import * as T from '../../vendor/three.module.js';
import {createOriginalCockpit as createFerrari} from '../ferrari-city/cockpit.mjs?v=ferrari-city-2';
import {loadTemplate} from '../porsche-garage/assets.mjs?v=porsche-1';
import {setCabinUp} from '../../cockpit-attitude.mjs';
import {setPorscheSteering} from './rig.mjs?v=mixed-city-2';
import {drivingReadout} from '../../race-hud.mjs';
const up=new T.Vector3(0,1,0),flip=new T.Quaternion().setFromAxisAngle(up,Math.PI);
export async function createOriginalCockpit(args){const [f,p]=await Promise.all([createFerrari(args),createPorsche(args)]);return{tavaculo:f,porsche:p};}
async function createPorsche({scene,camera}){
 const data=await loadTemplate('porsche'),group=data.root.clone(true);group.name='porsche-original-cabin';scene.add(group);group.visible=false;
 for(const id of ['fl','fr','rl','rr']){group.getObjectByName('steer_'+id).visible=false;group.getObjectByName('brake_'+id).visible=false;}
 const paints=new Map();group.traverse(o=>{if(!o.isMesh)return;if(o.material.name==='windows')o.material=new T.MeshBasicMaterial({name:'porsche-cabin-clear-glass',color:'#e9f7fa',transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide,fog:false});
  if(o.material.name==='study-body'){if(!paints.has(o.material))paints.set(o.material,o.material.clone());o.material=paints.get(o.material);}
 });
 function lens(prefix){const surface=group.getObjectByName(prefix);if(!surface)throw Error('Porsche mirror missing: '+prefix);const geometry=surface.geometry.clone(),p=geometry.attributes.position;geometry.computeBoundingBox();const box=geometry.boundingBox,size=box.getSize(new T.Vector3()),uv=[];
  for(let i=0;i<p.count;i++)uv.push((p.getX(i)-box.min.x)/size.x,(p.getY(i)-box.min.y)/size.y);
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));surface.geometry=geometry;surface.material=new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false,fog:false,side:T.DoubleSide});return surface;
 }
 const mirrorSurface=lens('mirror_middle_Mirror_0_body'),mirrorMount=new T.Group();group.add(mirrorMount);group.updateMatrixWorld(true);mirrorMount.attach(mirrorSurface);
 const sideMirrors=[['left',2,.22],['right',1,-.22]].map(([id,door,yaw])=>({id,surface:lens('mirror_door_'+door+'_Mirror_0_body'),origin:new T.Vector3(),aspect:1.65,yaw}));
 const baseline=[];group.traverse(o=>{if(o.isMesh)baseline.push({node:o,position:o.geometry.attributes.position,version:o.geometry.attributes.position.version});});
 let peek=null,amount=0,look=0,telemetry=drivingReadout({speed:0});const eyeWorld=new T.Vector3(),direction=new T.Vector3();
 function update({player,steeringAmount=0,lookDegrees=0,paint=null}={}){amount=Math.max(-1,Math.min(1,steeringAmount));look=peek??lookDegrees;setPorscheSteering(group,data.axis,amount);for(const m of paints.values())m.color.set(paint||'#e8e9e5');if(player){group.position.set(player.x,player.y||0,player.z);group.quaternion.fromArray(player.quaternion||[0,0,0,1]).multiply(flip);telemetry=drivingReadout(player);}}
 function applyCamera(){group.updateWorldMatrix(true,true);eyeWorld.copy(data.eye).applyMatrix4(group.matrixWorld);camera.position.copy(eyeWorld);direction.set(Math.sin(-look*Math.PI/180),-.045,-Math.cos(look*Math.PI/180)).normalize().applyQuaternion(group.quaternion);setCabinUp(camera.up,group.quaternion,up);camera.lookAt(eyeWorld.clone().add(direction));camera.fov=innerWidth<innerHeight?72:58;camera.near=.025;camera.far=700;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function stats(){return{construction:'original-porsche-911',eyeLocal:data.eye.toArray(),eyeWorld:eyeWorld.toArray(),steeringAmount:amount,lookDegrees:look,telemetry:{...telemetry},instruments:'source-static; live speed and gear in shared HUD',geometryUnchanged:baseline.every(b=>b.node.geometry.attributes.position===b.position&&b.position.version===b.version),mirrorReady:!!mirrorSurface.material.map,steeringQuaternion:group.getObjectByName('steering_wheel').quaternion.toArray()};}
 return{group,mirrorMount,mirrorSurface,sideMirrors,update,applyCamera,stats,setLook:value=>{peek=value;},reset:()=>{peek=null;amount=look=0;setPorscheSteering(group,data.axis,0);}};
}
