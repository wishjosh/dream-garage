import * as T from './vendor/three.module.js';
import {loadStudyCar} from './cockpit-study-model.mjs?v=steering-look-1';

// The inspected car and the driver's eye share a metre-based, scene-owned rig.
// Screen shape changes the crop, never the dimensions or position of a part.
export async function createOriginalCockpit({scene,camera,loader}) {
 const model=await loadStudyCar(loader);
 const group=new T.Group();group.name='original-gallardo-cockpit-rig';
 group.add(model.root);scene.add(group);group.visible=false;
 const geometries=[],materials=[],textures=[];
 const sourceBaseline=[];
 model.root.traverse(object=>{
  const attributes=Object.entries(object.geometry?.attributes||{}).map(([name,attribute])=>({name,attribute,version:attribute.version,count:attribute.count}));
  sourceBaseline.push({object,parent:object.parent,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),geometry:object.geometry,attributes,index:object.geometry?.index,indexVersion:object.geometry?.index?.version});
 });
 const wheel=model.root.getObjectByName('source_Circle');
 const material=options=>{const m=new T.MeshStandardMaterial(options);materials.push(m);return m;};
 const basic=options=>{const m=new T.MeshBasicMaterial(options);materials.push(m);return m;};
 const shell=material({color:'#10171c',roughness:.74,metalness:.08});
 const edge=material({color:'#606e75',roughness:.43,metalness:.55});
 function box(parent,size,position,mat){
  const geometry=new T.BoxGeometry(...size);geometries.push(geometry);
  const mesh=new T.Mesh(geometry,mat);mesh.position.set(...position);parent.add(mesh);return mesh;
 }
 function roundedSurface(width,height,radius){
  const s=new T.Shape(),x=width/2,y=height/2,r=radius;
  s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);
  s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);
  s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);
  const geometry=new T.ShapeGeometry(s,4),p=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/width+.5,p.getY(i)/height+.5);
  geometries.push(geometry);return geometry;
 }

 // There is no declared interior mirror in this source manifest. A small
 // driver-oriented mirror is added below the header; no source mesh is hidden.
 // Its pose is physical and fixed, including on a portrait phone.
 const mirrorMount=new T.Group();mirrorMount.name='original-live-mirror-mount';
 mirrorMount.position.set(-.23,1.11,-.80);group.add(mirrorMount);
 box(mirrorMount,[.263,.079,.025],[0,0,-.014],shell);
 box(mirrorMount,[.251,.067,.006],[0,0,.001],edge);
 box(mirrorMount,[.016,.044,.018],[.012,.059,-.018],shell);
 box(mirrorMount,[.039,.012,.029],[.012,.086,-.027],shell);
 const mirrorSurface=new T.Mesh(roundedSurface(.243,.06075,.006),basic({color:'#c8d7dd',toneMapped:false}));
 mirrorSurface.name='original-live-rear-view-surface';mirrorSurface.position.z=.006;
 mirrorMount.add(mirrorSurface);

 // The original analogue cluster remains intact. This compact telemetry
 // display sits on its driver-facing surface, behind the original wheel.
 const instrument=new T.Group();instrument.name='original-live-instrument';
 instrument.position.set(model.eye.x,.845,-.642);instrument.rotation.x=-.23;group.add(instrument);
 box(instrument,[.193,.066,.012],[0,0,-.008],shell);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
 const context=canvas.getContext('2d');
 if(!context)throw new Error('계기판 화면을 준비하지 못했습니다.');
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;textures.push(texture);
 const instrumentSurface=new T.Mesh(roundedSurface(.183,.057,.003),basic({color:'#ffffff',map:texture,toneMapped:false}));
 instrumentSurface.name='original-live-speed-gear';instrumentSurface.position.z=.001;instrument.add(instrumentSurface);

 const bodyQuaternion=new T.Quaternion(),originalForwardFlip=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
 const worldQuaternion=new T.Quaternion(),bodyOffset=new T.Vector3(),eyeWorld=new T.Vector3();
 const direction=new T.Vector3(),lookWorld=new T.Vector3(),yAxis=new T.Vector3(0,1,0);
 const pitch=T.MathUtils.degToRad(-4),verticalFov=42.38617142;
 let steeringAmount=0,lookDegrees=0,lastInstrument=-Infinity,lastKey='',disposed=false;
 let telemetry={car:'tavaculo',kmh:0,gear:'N',rpm:950,driveMode:'coast',instrumentHz:10,gearbox:'visual-automatic'};
 const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function drawInstrument(){
  const {kmh,gear,rpm}=telemetry;
  context.fillStyle='#080d11';context.fillRect(0,0,512,160);
  const ratio=clamp((rpm-900)/7100,0,1);
  for(let i=0;i<20;i++){
   context.fillStyle=i/20<ratio?(i<14?'#9ce4c4':i<18?'#ffd17c':'#ff7875'):'#253335';
   context.fillRect(19+i*24,12,18,6);
  }
  context.textBaseline='middle';context.textAlign='center';context.fillStyle='#eef6ef';
  context.font='700 108px system-ui, sans-serif';context.fillText(String(kmh),192,92);
  context.fillStyle=gear==='R'?'#ffc78e':'#aee6cf';context.font='700 102px system-ui, sans-serif';context.fillText(gear,423,91);
  context.fillStyle='#849e9c';context.font='500 15px system-ui, sans-serif';context.fillText('km/h',310,126);
  context.fillStyle='#354d4b';context.fillRect(356,42,2,99);texture.needsUpdate=true;
 }
 function update({player,steeringAmount:amount=0,lookDegrees:look=0,now=performance.now()}={}){
  if(disposed)return;
  steeringAmount=clamp(finite(amount),-1,1);lookDegrees=clamp(finite(look),-8,8);
  model.setSteeringAngle(T.MathUtils.degToRad(steeringAmount*110));
  if(player){
   const q=player.quaternion;
   if(Array.isArray(q)&&q.length===4&&q.every(Number.isFinite))bodyQuaternion.fromArray(q).normalize();
   else if(q?.isQuaternion)bodyQuaternion.copy(q).normalize();
   else bodyQuaternion.setFromAxisAngle(yAxis,finite(player.heading));
   bodyOffset.set(0,0,-.153821).applyQuaternion(bodyQuaternion);
   group.position.set(finite(player.x),finite(player.y),finite(player.z)).add(bodyOffset);
   group.quaternion.copy(bodyQuaternion).multiply(originalForwardFlip);
   const speed=Math.abs(finite(player.speed)),forwardSpeed=finite(player.forwardSpeed,speed),kmh=Math.round(speed*3.6);
   const driveMode=player.driveMode||'coast',reversing=forwardSpeed<-.25||driveMode==='reverse';
   const gear=reversing?'R':kmh<1?'N':String(Math.min(6,1+Math.floor(kmh/37)));
   const rpm=kmh<1?950:reversing?Math.min(8000,1200+kmh*170):1700+(kmh%37)/37*5900;
   telemetry={car:'tavaculo',kmh,gear,rpm:Math.round(rpm),driveMode,instrumentHz:10,gearbox:'visual-automatic'};
  }
  const key=[telemetry.kmh,telemetry.gear,Math.round(telemetry.rpm/100)].join('|');
  if(!lastKey||(finite(now)-lastInstrument>=100&&key!==lastKey)){
   drawInstrument();lastInstrument=finite(now);lastKey=key;
  }
  group.userData.telemetry=telemetry;
 }
 function applyCamera(){
  if(disposed)return;
  // Only the rig and its ancestors need their world matrices here. The normal
  // renderer traversal updates source parts once; no per-frame mesh scan.
  group.updateWorldMatrix(true,false);group.getWorldQuaternion(worldQuaternion);
  eyeWorld.copy(model.eye).applyMatrix4(group.matrixWorld);
  direction.copy(model.forward).applyAxisAngle(yAxis,T.MathUtils.degToRad(-lookDegrees));
  direction.x*=Math.cos(pitch);direction.z*=Math.cos(pitch);direction.y=Math.sin(pitch);
  direction.applyQuaternion(worldQuaternion);lookWorld.copy(eyeWorld).addScaledVector(direction,10);
  camera.position.copy(eyeWorld);
  if(camera.parent){camera.parent.updateWorldMatrix(true,false);camera.parent.worldToLocal(camera.position);}
  camera.up.copy(yAxis).applyQuaternion(worldQuaternion);camera.lookAt(lookWorld);
  if(camera.fov!==verticalFov||camera.near!==.035||camera.far!==700){
   camera.fov=verticalFov;camera.near=.035;camera.far=700;camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld(true);
 }
 function reset(){steeringAmount=0;lookDegrees=0;model.setSteeringAngle(0);lastKey='';lastInstrument=-Infinity;}
 function invariant(){
  const changed=[];
  for(const b of sourceBaseline){
   const o=b.object,g=o.geometry;
   if(o.parent!==b.parent||!o.position.equals(b.position)||!o.scale.equals(b.scale)||
    !(o===model.steeringPivot?model.steeringRotationValid():o.quaternion.equals(b.quaternion))||g!==b.geometry||
    g?.index!==b.index||g?.index?.version!==b.indexVersion||
    b.attributes.some(a=>g?.attributes[a.name]!==a.attribute||a.attribute.version!==a.version||a.attribute.count!==a.count))changed.push(o.name||o.type);
  }
  return{available:true,passed:changed.length===0,changed,checkedObjects:sourceBaseline.length,steeringRotationValid:model.steeringRotationValid()};
 }
 function projectedRect(object){
  camera.updateMatrixWorld(true);object.updateWorldMatrix(true,true);
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  const p=new T.Vector3();
  object.traverse(o=>{
   if(!o.isMesh)return;
   const position=o.geometry.attributes.position;
   for(let i=0;i<position.count;i++){
    p.fromBufferAttribute(position,i).applyMatrix4(o.matrixWorld).project(camera);
    if(p.z>1)continue;
    const x=(p.x+1)/2,y=(1-p.y)/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
  });
  return Number.isFinite(left)?{left,top,right,bottom,width:right-left,height:bottom-top}:null;
 }
 function stats(){
  let extraMeshes=0,extraTriangles=0;
  for(const node of [mirrorMount,instrument])node.traverse(o=>{if(o.isMesh){extraMeshes++;extraTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  const sourceVisible=group.visible&&model.root.visible;
  return{activeCar:'tavaculo',construction:'original-gallardo',meshes:model.stats.meshes+extraMeshes,triangles:model.stats.triangles+extraTriangles,textures:textures.length,
   instrumentHz:10,telemetry:{...telemetry},projectedBounds:{wheel:projectedRect(wheel),instrument:projectedRect(instrumentSurface),mirror:projectedRect(mirrorMount),mirrorSurface:projectedRect(mirrorSurface)},
   mirrorReady:!!mirrorSurface.material.map,provenance:{...model.provenance},model:{...model.stats},eyeWorld:eyeWorld.toArray(),eyeLocal:model.eye.toArray(),lookDegrees,steeringAmount,
   sceneOwned:group.parent===scene,cameraOwnsModel:group.parent===camera||model.root.parent===camera,sourceVisible,sourceScale:model.root.scale.toArray(),invariant:invariant()};
 }
 function dispose(){
  if(disposed)return;disposed=true;group.removeFromParent();
  const sourceGeometries=new Set(),sourceMaterials=new Set(),sourceTextures=new Set();
  model.root.traverse(o=>{if(!o.isMesh)return;sourceGeometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){sourceMaterials.add(m);for(const value of Object.values(m))if(value?.isTexture)sourceTextures.add(value);}});
  for(const g of new Set([...geometries,...sourceGeometries]))g.dispose();
  for(const m of new Set([...materials,...sourceMaterials]))m.dispose();
  for(const t of new Set([...textures,...sourceTextures]))t.dispose();
 }
 update();return{group,mirrorSurface,mirrorMount,update,applyCamera,reset,stats,dispose};
}
