import * as T from './vendor/three.module.js';
import {itemById} from './garage-core.mjs';

// Only cloned materials are changed; the stock model and opponent cars stay intact.
export function dressCar(model,car,loadout,rig){
 const ownedMaterials=[],ownedGeometry=[];
 const paint=itemById(loadout.paint),wheelItem=itemById(loadout.wheels);
 if(paint.color)model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let parent=mesh;while(parent&&parent!==model){if(parent.name.startsWith('wheel_'))return;parent=parent.parent;}
  const recolor=source=>{
   if(car==='tavaculo'&&source.name!=='CarSurface')return source;
   const m=source.clone();ownedMaterials.push(m);
   if(car==='tavaculo'){m.color.set(paint.color);m.metalness=.42;m.roughness=.28;}
   else{
    const target=new T.Color(paint.color);
    m.onBeforeCompile=shader=>{shader.uniforms.dreamPaint={value:target};shader.fragmentShader='uniform vec3 dreamPaint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float dreamMask = smoothstep(1.25, 1.8, diffuseColor.r / max(max(diffuseColor.g, diffuseColor.b), 0.001)) * smoothstep(0.12, 0.3, diffuseColor.r);
      diffuseColor.rgb = mix(diffuseColor.rgb, dreamPaint * max(diffuseColor.r, 0.35), dreamMask);`);};
    m.customProgramCacheKey=()=>car+paint.id;
   }return m;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(recolor):recolor(mesh.material);
 });
 if(wheelItem.color){
  const mat=new T.MeshStandardMaterial({color:wheelItem.color,metalness:.7,roughness:.28,emissive:wheelItem.id==='wheels-neon'?wheelItem.color:'#000000',emissiveIntensity:.25});ownedMaterials.push(mat);
  const radius=rig.radius*.65;
  const ring=new T.TorusGeometry(radius,.018,5,28),spoke=new T.BoxGeometry(.025,radius*.95,.025),hub=new T.SphereGeometry(.055,8,6);ownedGeometry.push(ring,spoke,hub);
  for(const info of rig.wheels){
   const w=model.getObjectByName(info.name);if(!w)continue;
   // Wheel roots are in vehicle axes: X is the axle, Y is up, Z is forward.
   w.updateWorldMatrix(true,true);const inv=new T.Matrix4().copy(w.matrixWorld).invert(),bounds=new T.Box3();
   w.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,mesh.matrixWorld));bounds.union(b);}});
   const side=Math.sign(info.position[0]),x=(side>0?bounds.max.x:bounds.min.x)+side*.012;
   const group=new T.Group();group.name='dream-wheel-trim';group.position.x=x;w.add(group);
   const rim=new T.Mesh(ring,mat);rim.rotation.y=Math.PI/2;group.add(rim);group.add(new T.Mesh(hub,mat));
   for(let i=0;i<wheelItem.spokes;i++){const s=new T.Mesh(spoke,mat);const angle=i*Math.PI*2/wheelItem.spokes;s.rotation.x=angle;s.position.y=Math.cos(angle)*radius*.48;s.position.z=Math.sin(angle)*radius*.48;group.add(s);}
  }
 }
 model.userData.dreamOwned={materials:ownedMaterials,geometry:ownedGeometry};return model;
}
export function disposeDress(model){const assets=model?.userData.dreamOwned;if(assets){assets.materials.forEach(m=>m.dispose());assets.geometry.forEach(g=>g.dispose());}}

export function buildGarage(scene){
 const garage=new T.Group();garage.position.set(0,0,-110);scene.add(garage);
 const cube=new T.BoxGeometry(1,1,1),floor=new T.MeshStandardMaterial({color:'#25323b',metalness:.35,roughness:.48}),dark=new T.MeshStandardMaterial({color:'#0a2335'}),light=color=>new T.MeshBasicMaterial({color});
 function box(w,h,d,x,y,z,mat){const mesh=new T.Mesh(cube,mat);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);garage.add(mesh);return mesh;}
 box(40,.18,36,0,0,0,floor);box(40,14,.3,0,6.9,6,dark);box(.3,14,36,-20,6.9,0,dark);box(.3,14,36,20,6.9,0,dark);
 const mint=light('#55e5d8'),pink=light('#ff83aa'),warm=light('#ffe2ae');
 for(const x of [-6,6]){box(.12,4.8,.12,x,2.4,3,mint);box(.12,.08,8,x,4.8,0,warm);}
 box(30,.035,.08,0,4.5,5.8,mint);box(6,.04,.06,2.5,.14,-3.6,pink);
 const platform=new T.Mesh(new T.CylinderGeometry(3.8,4,.12,64),new T.MeshStandardMaterial({color:'#24323b',metalness:.55,roughness:.4}));platform.position.y=.15;garage.add(platform);
 const edge=new T.Mesh(new T.TorusGeometry(3.83,.025,4,64),mint);edge.rotation.x=Math.PI/2;edge.position.y=.22;garage.add(edge);
 box(3,1,.8,-5,.7,3,dark);for(let i=0;i<3;i++)box(2.7,.04,.05,-5,.45+i*.3,2.58,pink);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#0a2335';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#edffff';ctx.font='800 86px system-ui';ctx.fillText('DREAM GARAGE',512,120);ctx.fillStyle='#63e5dc';ctx.font='500 30px system-ui';ctx.fillText('BUILD YOUR DREAM. RACE YOUR STORY.',512,190);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(6,1.5),new T.MeshBasicMaterial({map:tex}));sign.position.set(0,3.5,5.78);sign.rotation.y=Math.PI;garage.add(sign);
 const lamp=new T.PointLight('#92fff0',24,18,2);lamp.position.set(0,4,-1);garage.add(lamp);

 // A contained, illuminated workshop makes the player's car the focal point.
 const steel=new T.MeshStandardMaterial({color:'#52616c',metalness:.78,roughness:.38});
 const rubber=new T.MeshStandardMaterial({color:'#10161c',roughness:.92});
 const wallRibs=new T.InstancedMesh(cube,steel,34),obj=new T.Object3D();
 for(let i=0;i<34;i++){obj.position.set(-16.5+i,4.4,5.81);obj.scale.set(.045,8.7,.05);obj.updateMatrix();wallRibs.setMatrixAt(i,obj.matrix);}
 garage.add(wallRibs);
 const gridPoints=[];
 for(let i=-10;i<=10;i+=2){gridPoints.push(-14,.103,i,14,.103,i);gridPoints.push(i,.103,-14,i,.103,6);}
 const grid=new T.BufferGeometry();grid.setAttribute('position',new T.Float32BufferAttribute(gridPoints,3));garage.add(new T.LineSegments(grid,new T.LineBasicMaterial({color:'#425462',transparent:true,opacity:.36})));
 // Light strips reflected by the car paint, and a warm edge on the roof.
 for(const x of [-4,0,4]){
  box(.11,.05,8,x,5.5,-.4,warm);
  box(.26,.13,8.2,x,5.58,-.4,steel);
 }
 const fill=new T.PointLight('#c2e8ff',75,22,2);fill.position.set(3.8,4,-4);garage.add(fill);
 const rimLight=new T.PointLight('#ffe2bd',48,20,2);rimLight.position.set(-4,3.2,1);garage.add(rimLight);
 const plinthLight=new T.Mesh(new T.RingGeometry(3.9,4.4,64),new T.MeshBasicMaterial({color:'#64e0c4',transparent:true,opacity:.1,side:T.DoubleSide,depthWrite:false}));
 plinthLight.rotation.x=-Math.PI/2;plinthLight.position.y=.105;garage.add(plinthLight);
 for(let i=0;i<3;i++){
  const tire=new T.Mesh(new T.TorusGeometry(.34,.13,8,20),rubber);tire.rotation.y=Math.PI/2;tire.position.set(-6.3,1.0+i*.88,4.1);garage.add(tire);
  const hub=new T.Mesh(new T.CylinderGeometry(.21,.21,.12,12),steel);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);garage.add(hub);
 }
 box(1.6,.12,1,-6.3,.48,4.1,steel);box(.1,3.5,.1,-6.9,1.9,4.45,steel);
 box(3.6,.13,1.0,5.3,1.05,4.5,steel);box(3.3,.85,.8,5.3,.58,4.5,dark);
 for(let i=0;i<4;i++)box(.64,.05,.05,4.1+i*.78,.65,4.06,mint);
 const bayLine=new T.Mesh(new T.TorusGeometry(3.54,.018,4,64),steel);bayLine.rotation.x=Math.PI/2;bayLine.position.y=.22;garage.add(bayLine);
 garage.userData.sign=sign;return garage;
}
