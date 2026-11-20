import * as T from '../../vendor/three.module.js';
import {sunDirection} from './sky.mjs';
import {angleDelta,clamp} from '../../race-core.mjs';

const deg=T.MathUtils.degToRad;
const worldUp=new T.Vector3(0,1,0);
const tilt=new T.Quaternion(),yaw=new T.Quaternion(),angles=new T.Euler();
const pivot=new T.Vector3(0,.46,.06),shifted=new T.Vector3();

// Use the game's existing damped physical response. Only the sprung shell moves.
// Wheels, calipers, tyre grip and the collision body stay on their original rig.
export function shellPose(racer,limitMotion=false){
  const active=racer.motion?.enabled&&!limitMotion;
  return {
    pitch:active?clamp(racer.motion.pitch*1.23,-deg(3.1),deg(3.15)):0,
    roll:active?clamp(racer.motion.roll*1.10,-deg(4.7),deg(4.7)):0,
  };
}

export function prepareCar(body,kind,{player=false,garage=false,paint,wheels}={}){
  const bodyPaint=body.getObjectByName('body')?.material;
  if(kind==='tavaculo'&&bodyPaint&&body.userData.dreamOwned){
    if(!player||paint==='paint-mint')bodyPaint.color.set(player?'#83c7b0':'#b13e2c');
    bodyPaint.metalness=.65;
    bodyPaint.roughness=.25;
    bodyPaint.clearcoat=1;
    bodyPaint.clearcoatRoughness=.12;
  }
  if(kind==='tavaculo'&&body.userData.dreamOwned){
    for(const name of ['leather','interior_light','interior_dark','carpet','carbon_fibre_trim']){
      const mesh=body.getObjectByName(name);if(!mesh?.material?.color)continue;
      const m=mesh.material.clone();m.color.set(name==='interior_light'?'#545249':'#30332f');
      m.roughness=.78;m.metalness=.035;mesh.material=m;body.userData.dreamOwned.materials.push(m);
    }
    for(const name of ['rim_fl','rim_fr','rim_rl','rim_rr']){
      const rim=body.getObjectByName(name);
      if(rim?.material){if(!player||wheels==='wheels-stock')rim.material.color.set('#b6b6ab');rim.material.metalness=.90;rim.material.roughness=.29;}
    }
  }
  if(garage){
    const windshield=body.getObjectByName('glass');
    if(windshield){
      const pane=new T.MeshPhysicalMaterial({name:'Pit glazing',color:0x718681,metalness:.28,roughness:.11,clearcoat:1,transparent:true,opacity:.15,depthWrite:false});
      windshield.material=pane;
      body.userData.dreamOwned?.materials.push(pane);
    }
  }
  const lamps=[];
  const coachLens=body.getObjectByName('Brake lenses');
  if(coachLens)lamps.push(coachLens.material);
  if(kind==='tavaculo'){
    for(const name of ['lights_red','brakes']){
      const mesh=body.getObjectByName(name);
      if(!mesh?.material?.emissive)continue;
      const lamp=mesh.material.clone();
      lamp.color.set('#9c2118');lamp.emissive.set('#ff2a0c');lamp.emissiveIntensity=.12;
      mesh.material=lamp;
      lamps.push(lamp);
      (body.userData.dreamOwned??={materials:[],geometry:[]}).materials.push(lamp);
    }
  }
  return lamps;
}

export function moveShell(body,lamps,racer,reduce){
  const {pitch,roll}=shellPose(racer,reduce);
  yaw.setFromAxisAngle(worldUp,racer.heading);
  tilt.setFromEuler(angles.set(pitch,0,roll,'XYZ'));
  body.quaternion.copy(yaw).multiply(tilt);
  // Rotate around the mass of the car instead of swinging from a point on the road.
  shifted.copy(pivot).applyQuaternion(tilt).sub(pivot).applyQuaternion(yaw);
  body.position.set(racer.x-shifted.x,(racer.y??.045)-shifted.y-Math.abs(pitch)*.13,racer.z-shifted.z);
  for(const lamp of lamps)lamp.emissiveIntensity=racer.braking?2.65:.12;
}

export function createCameraRig(){
  let heading=null,previousView=null;
  const forward=new T.Vector3(),side=new T.Vector3(),target=new T.Vector3();
  return function setView({camera,racer,view,dt,snap,reduce}){
    const {pitch,roll}=shellPose(racer,reduce);
    const speed=Math.min(Math.abs(racer.forwardSpeed||0),55);
    const blend=clamp(speed/31,0,1);
    const speedRatio=reduce?0:blend*blend*(3-2*blend);
    const portrait=camera.aspect<1;
    if(snap||previousView!==view||heading===null)heading=racer.heading;
    else heading+=angleDelta(racer.heading,heading)*(-Math.expm1(-dt*(reduce?16:9)));
    previousView=view;
    camera.up.copy(worldUp);
    if(view==='chase'){
      // Follow in car space. Filtering an absolute position used to leave the car farther away at high speed.
      forward.set(Math.sin(heading),0,Math.cos(heading));side.set(forward.z,0,-forward.x);
      const distance=(portrait?6.8:5.58)+speedRatio*.34;
      const cornerOffset=clamp(angleDelta(racer.heading,heading)*2.15,-.48,.48);
      camera.position.set(racer.x,(racer.y||0)+(portrait?2.03:1.83)+pitch*.85-speedRatio*.17,racer.z)
        .addScaledVector(forward,-distance).addScaledVector(side,reduce?0:-cornerOffset);
      target.set(racer.x,(racer.y||0)+(portrait?.84:.69),racer.z)
        .addScaledVector(forward,4.5).addScaledVector(side,cornerOffset*.85);
      camera.fov=(portrait?49:48)+speedRatio*6.8;
    }else if(view==='hood'){
      forward.set(Math.sin(racer.heading),0,Math.cos(racer.heading));side.set(forward.z,0,-forward.x);
      camera.position.set(racer.x,(racer.y||0)+1.00-pitch*.27,racer.z).addScaledVector(forward,.88).addScaledVector(side,.18);
      target.copy(camera.position).addScaledVector(forward,25).addScaledVector(side,clamp(racer.steeringAngle*speed*.11,-1.0,1.0));
      target.y-=.34+pitch*8;
      camera.up.addScaledVector(side,-roll*.23).normalize();
      camera.fov=(portrait?60:61)+speedRatio*4.2;
    }else return;
    camera.lookAt(target);camera.updateProjectionMatrix();
  };
}

export function nextView(view){
  return view==='chase'?'hood':view==='hood'?'cockpit':'chase';
}
export const viewNames={chase:'차 뒤',hood:'보닛',cockpit:'운전석'};


let directionalShade;
export function attachRoadShade(contact){
  if(!directionalShade){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
    const fade=ctx.createRadialGradient(64,64,2,64,64,62);fade.addColorStop(0,'rgba(22,20,18,.85)');
    fade.addColorStop(.60,'rgba(22,20,18,.64)');fade.addColorStop(1,'rgba(22,20,18,0)');
    ctx.fillStyle=fade;ctx.fillRect(0,0,128,128);
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
    directionalShade=new T.MeshBasicMaterial({map:tx,transparent:true,toneMapped:false,depthWrite:false});
  }
  const cast=new T.Mesh(contact.geometry,directionalShade);
  cast.scale.set(.88,.84,1);cast.position.z=.003;cast.renderOrder=1;
  contact.add(cast);contact.userData.penumbra=cast;
}
export function lightOnGround(contact,heading){
  const c=Math.cos(heading),s=Math.sin(heading);
  // Sunlight comes from the same world direction as the highlights on the body.
  const x=-sunDirection.x*.74,z=-sunDirection.z*.74;
  contact.userData.penumbra.position.set(x*c-z*s,-x*s-z*c,.003);
}
