import * as T from './vendor/three.module.js';
import {setCabinUp} from './cockpit-attitude.mjs';
import {drivingReadout} from './race-hud.mjs';
import {LINEUP} from './lineup-shapes.mjs';

const profiles={
  'rally-hatch':{eye:[-.25,1.26,.12],sill:.94,front:.77,roof:1.48,roofFront:.37},
  'muscle-coupe':{eye:[-.29,1.09,.31],sill:.86,front:.76,roof:1.31,roofFront:.16}
};
const up=new T.Vector3(0,1,0);
const flip=new T.Quaternion().setFromAxisAngle(up,Math.PI);
const mix=T.MathUtils.lerp;
function standard(color,roughness=.68,metalness=.12){
  return new T.MeshStandardMaterial({color,roughness,metalness,side:T.DoubleSide});
}
function put(parent,geometry,material,x=0,y=0,z=0){
  const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function rod(parent,material,start,end,ra,rb=ra){
  const a=new T.Vector3(...start),b=new T.Vector3(...end),axis=b.clone().sub(a);
  const mesh=put(parent,new T.CylinderGeometry(rb,ra,axis.length(),12),material);
  mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(up,axis.normalize());return mesh;
}
// A formed panel with correctly oriented UVs. Coordinates are in cabin space, facing -Z.
function skin(parent,material,columns,rows,point){
  const xyz=[],uv=[],idx=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const u=i/columns,v=j/rows;xyz.push(...point(u,v));uv.push(u,v);
    if(i&&j){const d=j*(columns+1)+i,a=d-columns-2;idx.push(a,a+1,d,a,d,d-1);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  return put(parent,g,material);
}
function cluster(group,x,y,z){
  const pod=new T.Group();group.add(pod);pod.position.set(x,y,z);pod.rotation.x=-.085;
  const shell=standard(0x20282c,.56);
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=120;
  const c=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  put(pod,new T.BoxGeometry(.310,.107,.036),shell);
  put(pod,new T.PlaneGeometry(.295,.092),new T.MeshBasicMaterial({map,toneMapped:false}),0,0,.019);
  const visor=put(pod,new T.BoxGeometry(.315,.009,.050),shell,0,.056,.011);visor.rotation.x=-.09;
  let last='',drawnAt=-Infinity;
  function update(data,now){
    const leds=Math.round(data.ratio*12),key=[data.kmh,data.gear,leds].join('/');
    if(last===key||now-drawnAt<65)return;
    last=key;drawnAt=now;
    c.fillStyle='#101b20';c.fillRect(0,0,384,120);
    for(let i=0;i<12;i++){c.fillStyle=i>=leds?'#2a363b':i<7?'#63e1b4':i<10?'#ffd069':'#ff6257';c.fillRect(8+i*31,5,26,8);}
    c.fillStyle='#263840';c.fillRect(241,23,2,87);
    c.textAlign='right';c.font='bold 84px Arial';c.fillStyle='#f3f7f6';c.fillText(String(data.kmh),208,93);
    c.font='16px Arial';c.fillStyle='#bfccd0';c.fillText('km/h',225,112);
    c.textAlign='center';c.font='bold 83px Arial';c.fillStyle='#ffc76b';c.fillText(data.gear,310,94);
    c.font='14px Arial';c.fillStyle='#bfccd0';c.fillText('GEAR',310,112);map.needsUpdate=true;
  }
  return {update};
}
function createCabin({scene,camera},id,{wheel,dash},bonnetGeometry){
  const p=profiles[id],spec=LINEUP[id],eye=new T.Vector3(...p.eye),half=spec.width*.48;
  const group=new T.Group();group.name=id+'-cup-cabin';group.visible=false;scene.add(group);
  const trim=standard(0x20262b,.8),rubber=standard(0x101416,.91),cage=standard(0x51595c,.55,.45);
  const paint=new T.MeshPhysicalMaterial({color:spec.color,metalness:.47,roughness:.36,clearcoat:.54,envMap:scene.environment,envMapIntensity:.58,side:T.DoubleSide});
  // This is the same bonnet mesh used on the exterior, including its creases and wheelbase.
  const bonnet=put(group,bonnetGeometry,paint);bonnet.rotation.y=Math.PI;
  bonnetGeometry.computeBoundingBox();
  const bonnetLength=bonnetGeometry.boundingBox.max.z-bonnetGeometry.boundingBox.min.z;
  const near=eye.z-.64,far=-p.front,top=eye.y-.265;
  const curvature=u=>.048*(1-(2*u-1)**2);
  skin(group,trim,24,4,(u,v)=>[(2*u-1)*half,mix(top,p.sill,v)+curvature(u)*.35, mix(near,far,v)-curvature(u)]);
  const face=new T.MeshBasicMaterial({map:dash,side:T.DoubleSide,color:0xd3d7dc});
  skin(group,face,24,4,(u,v)=>[(2*u-1)*half,mix(top-.31,top,v)+curvature(u)*.35,near+(1-v)*.018-curvature(u)]);
  for(const side of [-1,1]){
    const bx=half*side,tx=side*half*.83;
    const lower=[bx,p.sill,-p.front],upper=[tx,p.roof,-p.roofFront];
    rod(group,paint,lower,upper,.039,.031);
    rod(group,rubber,[bx*.966,p.sill,-p.front+.013],[tx*.968,p.roof,-p.roofFront+.014],.024,.024);
    rod(group,cage,[bx*1.015,p.sill-.04,-p.front+.065],[tx*1.015,p.roof-.018,-p.roofFront+.058],.019);
    // Door tops extend back past the eye, keeping the lateral windows open.
    rod(group,trim,[bx,p.sill,-p.front],[side*half*1.02,p.sill-.045,eye.z+.45],.042);
    rod(group,trim,[tx,p.roof,-p.roofFront],[tx,p.roof,eye.z+.54],.040);
    skin(group,trim,6,2,(u,v)=>[side*half*(1+.02*u),mix(.33,p.sill-.045*u,v),mix(-p.front,eye.z+.54,u)]);
  }
  rod(group,trim,[-half*.83,p.roof,-p.roofFront],[half*.83,p.roof,-p.roofFront],.039);
  skin(group,trim,12,2,(u,v)=>[(2*u-1)*half*.85,p.roof+.019*(1-(2*u-1)**2),mix(-p.roofFront,eye.z+.6,v)]);
  const glassSeal=skin(group,rubber,24,1,(u,v)=>[(2*u-1)*half,p.sill+.011+curvature(u)*.35,-p.front-v*.023-curvature(u)]);
  glassSeal.name='windscreen-base';
  const mirrorMount=new T.Group();group.add(mirrorMount);
  mirrorMount.position.set(eye.x+.37,eye.y+.217,eye.z-.89);
  rod(mirrorMount,trim,[0,.029,0],[.015,.067,.063],.010,.012);
  const mountPad=put(mirrorMount,new T.BoxGeometry(.055,.027,.048),rubber,.015,.074,.074);mountPad.rotation.x=-.47;
  put(mirrorMount,new T.BoxGeometry(.239,.066,.027),rubber);
  const mirrorSurface=put(mirrorMount,new T.PlaneGeometry(.226,.053),new T.MeshBasicMaterial(),0,0,.014);
  const meter=cluster(group,eye.x,eye.y-.158,eye.z-.89);
  put(group,new T.BoxGeometry(.210,.099,.058),rubber,eye.x,eye.y-.246,eye.z-.91);
  const hub=new T.Group();group.add(hub);hub.position.set(eye.x,eye.y-.326,eye.z-.69);hub.rotation.x=-.12;
  const spinner=new T.Group();hub.add(spinner);
  const wheelWidth=.468,wheelHeight=wheelWidth*wheel.image.height/wheel.image.width;
  const wheelMaterial=new T.MeshBasicMaterial({map:wheel,alphaTest:.22,color:0xe9e9e2,side:T.DoubleSide});
  skin(spinner,wheelMaterial,24,14,(u,v)=>[(u-.5)*wheelWidth,(v-.5)*wheelHeight,.015*Math.abs(2*u-1)**2]);
  const cloth=standard(0x292b30,.94,.015);
  const wrists=[],sleeves=[],anchors=[];
  for(const sign of [-1,1]){
    const at=new T.Vector3(sign*.437*wheelWidth,-.364*wheelHeight,.004);
    wrists.push(at);anchors.push(new T.Vector3(sign*.256,-.325,.18));
    sleeves.push(put(hub,new T.CylinderGeometry(.035,.051,1,16),cloth));
  }
  const end=new T.Vector3(),delta=new T.Vector3(),eyeWorld=new T.Vector3(),direction=new T.Vector3(),aim=new T.Vector3();
  let peek=null,look=0,amount=0,telemetry=drivingReadout({speed:0});
  function steer(value){
    amount=T.MathUtils.clamp(value,-1,1);spinner.rotation.z=-amount*1.30;
    for(let i=0;i<sleeves.length;i++){
      end.copy(wrists[i]).applyQuaternion(spinner.quaternion);
      delta.copy(end).sub(anchors[i]);const sleeve=sleeves[i];
      sleeve.position.copy(anchors[i]).lerp(end,.5);sleeve.scale.y=delta.length();
      sleeve.quaternion.setFromUnitVectors(up,delta.normalize());
    }
  }
  function update({player,steeringAmount=0,lookDegrees=0,paint:finish,now=performance.now()}){
    if(!group.visible||!player)return;
    group.position.set(player.x,player.y||0,player.z);group.quaternion.fromArray(player.quaternion).multiply(flip);
    look=peek??lookDegrees;steer(steeringAmount);paint.color.set(finish||spec.color);
    telemetry=drivingReadout(player);meter.update(telemetry,now);
  }
  function applyCamera(){
    group.updateWorldMatrix(true,false);eyeWorld.copy(eye).applyMatrix4(group.matrixWorld);
    camera.position.copy(eyeWorld);const yaw=T.MathUtils.degToRad(look);
    direction.set(-Math.sin(yaw),-.046,-Math.cos(yaw)).normalize().applyQuaternion(group.quaternion);
    setCabinUp(camera.up,group.quaternion,up);camera.lookAt(aim.copy(eyeWorld).add(direction));
    camera.fov=camera.aspect<1?73:55;camera.near=.025;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  }
  return {group,mirrorMount,mirrorSurface,sideMirrors:[],update,applyCamera,
    setLook:value=>{peek=value;},reset:()=>{peek=null;look=0;steer(0);},
    stats:()=>({construction:'cup-'+id,telemetry:{...telemetry},eyeLocal:eye.toArray(),eyeWorld:eyeWorld.toArray(),
      steeringAmount:amount,steeringQuaternion:spinner.quaternion.toArray(),wheelAngle:spinner.rotation.z,lookDegrees:look,
      mirrorReady:!!mirrorSurface.material.map,bonnetLength})};
}
export async function createCupCockpits(args,fleet){
  const loader=new T.TextureLoader();
  const [wheel,dash]=await Promise.all(['cup-wheel-gloves','cup-dash'].map(async name=>{
    const map=await loader.loadAsync(new URL('./assets/lineup/'+name+'.webp',import.meta.url).href);
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
  }));
  return Object.fromEntries(Object.keys(profiles).map(id=>[id,createCabin(args,id,{wheel,dash},fleet[id].bonnetGeometry)]));
}
