import * as T from '../../vendor/three.module.js';
import {loadFerrari} from './asset.mjs?v=ferrari-city-2';
import {drivingReadout} from '../../race-hud.mjs';
import {setCabinUp} from '../../cockpit-attitude.mjs';
const yAxis=new T.Vector3(0,1,0),flip=new T.Quaternion().setFromAxisAngle(yAxis,Math.PI);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const steeringTurn=new T.Quaternion();
// The tilted source local +Y axis points away from the driver.
// The caller already negates the physical steering angle; do not negate twice.
export function setFerrariSteering(wheel,base,amount){wheel.quaternion.copy(base).multiply(steeringTurn.setFromAxisAngle(yAxis,clamp(amount,-1,1)*1.92));}
function canvasTexture(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return{canvas,ctx:canvas.getContext('2d'),texture};}
function face(texture,width,height){return new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,toneMapped:false,fog:false}));}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
export async function createOriginalCockpit({scene,camera}){
 const data=await loadFerrari(),group=new T.Group(),frame=new T.Group(),source=data.source.clone(true);group.name='ferrari-original-cabin';frame.scale.setScalar(data.scale);frame.position.copy(data.offset);frame.add(source);group.add(frame);scene.add(group);
 const baseline=[];source.traverse(o=>{if(o.isMesh)baseline.push({node:o,geometry:o.geometry,position:o.geometry.attributes.position});});
 for(const name of ['wheel_fl','wheel_fr','wheel_rl','wheel_rr'])source.getObjectByName(name).visible=false;
 const cabinPaint=source.getObjectByName('body');cabinPaint.material=cabinPaint.material.clone();
 const glass=source.getObjectByName('glass');glass.material=new T.MeshBasicMaterial({name:'ferrari-cabin-clear-glass',color:'#e9f7fa',transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide,fog:false});
 const steering=source.getObjectByName('steering_wheel'),steeringBase=steering.quaternion.clone();source.updateMatrixWorld(true);source.attach(source.getObjectByName('steering_column'));
 // These additions sit on the source instrument and mirror faces, in source metres.
 const dial=canvasTexture(512,512),c=dial.ctx;c.fillStyle='#d5b54e';c.beginPath();c.arc(256,256,256,0,Math.PI*2);c.fill();
 c.strokeStyle='#222728';c.lineWidth=9;c.beginPath();c.arc(256,256,242,0,Math.PI*2);c.stroke();c.textAlign='center';c.textBaseline='middle';
 for(let i=0;i<=40;i++){const a=(-220+i*7)*Math.PI/180,r=i%5?207:193;c.strokeStyle=i>=35?'#a51e19':'#202526';c.lineWidth=i%5?3:6;c.beginPath();c.moveTo(256+Math.cos(a)*r,256+Math.sin(a)*r);c.lineTo(256+Math.cos(a)*228,256+Math.sin(a)*228);c.stroke();if(i%5===0){c.fillStyle=c.strokeStyle;c.font='bold 32px Arial';c.fillText(String(i/5),256+Math.cos(a)*163,256+Math.sin(a)*163);}}
 c.fillStyle='#252b2b';c.font='20px Arial';c.fillText('RPM × 1000',256,325);c.font='bold 24px Arial';c.fillText('458',256,365);dial.texture.needsUpdate=true;
 const instrument=new T.Group();instrument.name='functional-original-tachometer';instrument.position.set(-.345675,.8212,-.6803);instrument.rotation.x=-10*Math.PI/180;
 const dialMesh=new T.Mesh(new T.CircleGeometry(.0515,64),new T.MeshBasicMaterial({map:dial.texture,toneMapped:false,fog:false}));instrument.add(dialMesh);
 const needlePivot=new T.Group(),needle=new T.Mesh(new T.BoxGeometry(.002,.039,.0007),new T.MeshBasicMaterial({color:'#b8171c',toneMapped:false,fog:false}));needle.position.set(0,.017,.0015);needlePivot.add(needle);instrument.add(needlePivot);
 const hub=new T.Mesh(new T.CircleGeometry(.004,24),new T.MeshBasicMaterial({color:'#222728',toneMapped:false}));hub.position.z=.0025;instrument.add(hub);frame.add(instrument);
 const speedDisplay=canvasTexture(512,256),display=face(speedDisplay.texture,.139,.0695);display.name='functional-speed-and-gear';display.position.set(-.477,.805,-.615);display.rotation.x=-10*Math.PI/180;frame.add(display);
 const statusDisplay=canvasTexture(256,256),status=face(statusDisplay.texture,.086,.086);status.name='functional-drive-status';status.position.set(-.225,.808,-.628);status.rotation.x=-10*Math.PI/180;frame.add(status);
 let lastText='',lastDraw=-Infinity,updates=0;
 function draw(readout,now){
  needlePivot.rotation.z=(130-readout.rpm/8000*280)*Math.PI/180;
  const key=readout.kmh+':'+readout.gear;if(key===lastText||now-lastDraw<100)return;lastText=key;lastDraw=now;updates++;
  const c=speedDisplay.ctx;c.fillStyle='#071019';c.fillRect(0,0,512,256);c.fillStyle='#d6edf1';c.font='bold 100px Arial';c.textAlign='left';c.fillText(String(readout.kmh),28,128);c.font='26px Arial';c.fillStyle='#91a9b4';c.fillText('km/h',30,173);c.fillStyle='#f0cd63';c.font='bold 96px Arial';c.fillText(readout.gear,380,130);c.font='23px Arial';c.fillText('GEAR',365,175);c.fillStyle='#263b45';roundRect(c,26,207,460,8,4);c.fillStyle='#86c6b6';roundRect(c,26,207,Math.max(8,readout.kmh/200*460),8,4);speedDisplay.texture.needsUpdate=true;
  const s=statusDisplay.ctx;s.fillStyle='#08131a';s.fillRect(0,0,256,256);s.textAlign='center';s.fillStyle='#81b8a9';s.font='20px Arial';s.fillText('SPEED',128,54);s.fillStyle='#e9eef0';s.font='bold 64px Arial';s.fillText(String(readout.kmh),128,137);s.fillStyle='#93a6af';s.font='20px Arial';s.fillText('km/h',128,197);statusDisplay.texture.needsUpdate=true;
 }
 // Retain the source housings; thin lenses cover only the original blank faces.
 const mirrorMount=new T.Group();mirrorMount.name='ferrari-rear-mirror-mount';frame.add(mirrorMount);
 frame.updateWorldMatrix(true,true);
 const chrome=source.getObjectByName('chrome'),raw=chrome.geometry.clone().applyMatrix4(new T.Matrix4().copy(frame.matrixWorld).invert().multiply(chrome.matrixWorld));
 function lens(name,predicate){
  const p=raw.attributes.position,indices=raw.index,points=[];
  for(let i=0;i<(indices?.count||p.count);i+=3){const triangle=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,indices?indices.getX(i+k):i+k));const center=triangle.reduce((a,v)=>a.add(v),new T.Vector3()).divideScalar(3);if(predicate(center))for(const v of triangle)points.push(v);}
  if(points.length<6)throw Error('Source mirror face not found: '+name);
  const box=new T.Box3().setFromPoints(points),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
  const positions=points.flatMap(v=>v.clone().sub(center).toArray()),uv=points.flatMap(v=>[(v.x-box.min.x)/size.x,(v.y-box.min.y)/size.y]);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const surface=new T.Mesh(geometry,new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false,fog:false,side:T.DoubleSide}));surface.name=name;surface.position.copy(center);surface.position.z+=.0015;return surface;
 }
 const mirrorSurface=lens('ferrari-rear-mirror-lens',p=>Math.abs(p.x)<.14&&p.y>1.05&&p.y<1.14&&p.z>-.32&&p.z<-.25);mirrorMount.add(mirrorSurface);
 const sideMirrors=[[-1,'left'],[1,'right']].map(([sign,id])=>{const surface=lens('ferrari-'+id+'-mirror-lens',p=>p.x*sign>.94&&p.y>.79&&p.y<.93&&p.z>-.49&&p.z<-.35);frame.add(surface);return{id,surface,origin:new T.Vector3(),aspect:1.65,yaw:sign*-.22};});raw.dispose();

 let peek=null,lookRequests=0,lastPeek=null,telemetry=drivingReadout({speed:0}),lookDegrees=0,steeringAmount=0;const eye=new T.Vector3(-.346,1.055,.16),eyeWorld=new T.Vector3(),direction=new T.Vector3();
 function update({player,steeringAmount:amount=0,lookDegrees:look=0,now=performance.now(),paint=null}={}){
  steeringAmount=clamp(amount,-1,1);lookDegrees=peek??clamp(look,-8,8);setFerrariSteering(steering,steeringBase,steeringAmount);
  if(player){group.position.set(player.x,player.y||0,player.z);group.quaternion.fromArray(player.quaternion||[0,0,0,1]).multiply(flip);telemetry=drivingReadout(player);}
  cabinPaint.material.color.set(paint||'#ff0000');draw(telemetry,now);
 }
 function applyCamera(){
  frame.updateWorldMatrix(true,false);eyeWorld.copy(eye).applyMatrix4(frame.matrixWorld);camera.position.copy(eyeWorld);
  direction.set(Math.sin(-lookDegrees*Math.PI/180),-.045,-Math.cos(lookDegrees*Math.PI/180)).normalize().applyQuaternion(group.quaternion);camera.lookAt(eyeWorld.clone().add(direction));setCabinUp(camera.up,group.quaternion,yAxis);camera.lookAt(eyeWorld.clone().add(direction));
  camera.fov=innerWidth<innerHeight?72:58;camera.near=.025;camera.far=700;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 }
 function rect(object){object.updateWorldMatrix(true,false);const box=new T.Box3().setFromObject(object),corners=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera);corners.push([(p.x+1)/2,(1-p.y)/2]);}return{left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),bottom:Math.max(...corners.map(p=>p[1]))};}
 function stats(){return{construction:'original-ferrari-458',peekActive:peek!==null,lookRequests,lastPeek,telemetry:{...telemetry},instrumentUpdates:updates,instrumentHzCap:10,eyeLocal:eye.toArray(),eyeWorld:eyeWorld.toArray(),steeringAmount,lookDegrees,steeringQuaternion:steering.quaternion.toArray(),glassOpacity:glass.material.opacity,geometryUnchanged:baseline.every(b=>b.node.geometry===b.geometry&&b.node.geometry.attributes.position===b.position),mirrorReady:!!mirrorSurface.material.map,projectedBounds:{instrument:rect(instrument),speed:rect(display),mirror:rect(mirrorSurface)},sourceScale:data.scale,sceneOwned:group.parent===scene};}
 update();return{group,mirrorMount,mirrorSurface,sideMirrors,update,applyCamera,stats,setLook:value=>{peek=value;if(value!==null){lookRequests++;lastPeek=value;}},reset:()=>{peek=null;steeringAmount=lookDegrees=0;steering.quaternion.copy(steeringBase);},dispose:()=>group.removeFromParent()};
}
