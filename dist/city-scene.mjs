import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {trackFrame,nearestTrack} from './race-core.mjs';
import {CITY_WATER_ZONES} from './course-recovery.mjs';
// Existing city scenery, unchanged; loaded only for the four city courses.
export async function buildCityScene(scene,track,{renderer,sectors:SECTORS}){
 const {length,frames}=track,N=frames.length;
 const unit=new T.BoxGeometry(1,1,1),palette={};
 const basic=color=>new T.MeshBasicMaterial({color});
 const material=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const mats={road:material('#707c87',.86),walk:material('#64778a'),navy:material('#142b43'),white:material('#c1d3de'),cyan:basic('#66f4f1'),pink:basic('#ff7197'),gold:basic('#ffdc9d'),dark:material('#143b53',.3,.5)};
 function box(w,h,d,x,y,z,mat=mats.navy,parent=scene){const m=new T.Mesh(unit,mat);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
 function ribbon(width,y,mat){
  const v=[],uv=[],idx=[];for(let i=0;i<=N;i++){const f=frames[i%N];for(const k of [-1,1]){v.push(f.x+f.rx*width*k,y,f.z+f.rz*width*k);uv.push((k+1)*width/7,i/N*length/7);}if(i<N){let a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,mat);scene.add(mesh);return mesh;
 }
 box(track.bounds.xmax-track.bounds.xmin+600,.5,track.bounds.zmax-track.bounds.zmin+600,(track.bounds.xmax+track.bounds.xmin)/2,-.6,(track.bounds.zmax+track.bounds.zmin)/2,material('#163d43'));
 const [seaZone,northZone]=CITY_WATER_ZONES;const bay=new T.Mesh(new T.PlaneGeometry(seaZone.width,seaZone.depth,1,1),new T.MeshStandardMaterial({color:'#08617d',roughness:.28,metalness:.55,emissive:'#073b59',emissiveIntensity:.4}));bay.rotation.x=-Math.PI/2;bay.position.set(seaZone.x,-.12,seaZone.z);scene.add(bay);const northBay=new T.Mesh(new T.PlaneGeometry(northZone.width,northZone.depth),bay.material);northBay.rotation.x=-Math.PI/2;northBay.position.set(northZone.x,-.12,northZone.z);scene.add(northBay);
 ribbon(12,0,mats.walk);ribbon(8.2,.045,mats.road);
 const asphalt=await new T.TextureLoader().loadAsync('./assets/materials/asphalt-color.jpg');asphalt.colorSpace=T.SRGBColorSpace;asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);mats.road.map=asphalt;mats.road.needsUpdate=true;
 function instances(geo,mat,items){const inst=new T.InstancedMesh(geo,mat,items.length),o=new T.Object3D();items.forEach((a,i)=>{o.position.set(...a.pos);o.rotation.set(0,a.angle||0,0);o.scale.set(...a.scale);o.updateMatrix();inst.setMatrixAt(i,o.matrix);if(a.color)inst.setColorAt(i,new T.Color(a.color));});inst.instanceMatrix.needsUpdate=true;scene.add(inst);return inst;}
 const blocks=[],leds=[],curbs=[],marks=[],poles=[],arms=[],lamps=[];
 const segmentCount=Math.floor(length/5);
 for(let i=0;i<segmentCount;i++){
  const s=i/segmentCount*length,f=trackFrame(track,s),yaw=Math.atan2(f.tx,f.tz);
  for(const side of [-1,1]){
   blocks.push({pos:[f.x+f.rx*side*8.8,.64,f.z+f.rz*side*8.8],scale:[.44,1.05,length/segmentCount-.12],angle:yaw,color:i%3?'#183149':'#c3d7df'});
   leds.push({pos:[f.x+f.rx*side*8.55,.96,f.z+f.rz*side*8.55],scale:[.05,.1,length/segmentCount-.3],angle:yaw,color:side===1?'#62eef0':'#ff7197'});
   curbs.push({pos:[f.x+f.rx*side*7.9,.09,f.z+f.rz*side*7.9],scale:[.55,.07,length/segmentCount-.08],angle:yaw,color:i%2?'#e6f0f6':'#ff7499'});
  }
  if(i%2===0)marks.push({pos:[f.x,.055,f.z],scale:[.13,.012,3.2],angle:yaw});
  if(i%5===0){for(const side of [-1,1]){
   const x=f.x+f.rx*side*10.6,z=f.z+f.rz*side*10.6;
   poles.push({pos:[x,4.8,z],scale:[.12,9.6,.12]});arms.push({pos:[x-f.rx*side*1.3,9.6,z-f.rz*side*1.3],scale:[2.8,.12,.13],angle:yaw});
   lamps.push({pos:[x-f.rx*side*2.6,9.5,z-f.rz*side*2.6],scale:[1.5,.1,.8],angle:yaw});
  }}
 }
 instances(unit,mats.white,blocks);instances(unit,basic('#ffffff'),leds);instances(unit,basic('#ffffff'),curbs);instances(unit,mats.white,marks);instances(unit,mats.navy,poles);instances(unit,mats.navy,arms);instances(unit,basic('#e5ffff'),lamps);
 // A single shared texture and instanced windows keep the skyline light on mobile.
 function windowTexture(){const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d');x.fillStyle='#12374c';x.fillRect(0,0,128,256);for(let row=0;row<16;row++)for(let col=0;col<6;col++){const n=(row*31+col*17)%9;if(n<6){x.fillStyle=n<4?'#f9ca85':'#78c6dc';x.fillRect(7+col*20,7+row*16,9,8);}}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
 const wintex=windowTexture(),buildingMat=new T.MeshStandardMaterial({map:wintex,emissiveMap:wintex,emissive:'#ffffff',emissiveIntensity:.6,roughness:.55});
 for(let i=0;i<17;i++){
  const x=45+(i%5)*19,z=30+Math.floor(i/5)*33,h=22+(i*17)%39,w=9+(i%3)*3;
  box(w,h,12,x,h/2,z,buildingMat);box(w+.4,.25,12.4,x,h+.1,z,i%2?mats.cyan:mats.pink);
  const reflection=new T.Mesh(new T.PlaneGeometry(w*.8,h*.72),new T.MeshBasicMaterial({map:wintex,color:'#337e99',transparent:true,opacity:.15,depthWrite:false}));reflection.rotation.x=-Math.PI/2;reflection.position.set(x,-.09,z-h*.28);scene.add(reflection);
 }
 // Broad public promenade and a small pier for the wheel.
 box(6,.32,145,14,.0,54,mats.walk);box(34,.4,10,38,-.05,83,mats.navy);
 const rails=[];for(let z=-15;z<126;z+=5){rails.push({pos:[17,.7,z],scale:[.06,1.3,.06]});}instances(unit,mats.white,rails);box(.06,.06,145,17,1.35,54,mats.cyan);
 const wheel=new T.Group();wheel.position.set(57,25,90);wheel.rotation.y=-.15;scene.add(wheel);
 for(const z of [-.6,.6]){const rim=new T.Mesh(new T.TorusGeometry(21,.13,5,80),mats.cyan);rim.position.z=z;wheel.add(rim);}
 const spoke=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;spoke.push(0,0,0,Math.cos(a)*21,Math.sin(a)*21,0);}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(spoke,3));wheel.add(new T.LineSegments(sg,new T.LineBasicMaterial({color:'#9dc7df'})));
 const capsules=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const c=box(1.6,1.4,1.5,Math.cos(a)*21,Math.sin(a)*21,0,i%2?mats.pink:mats.gold,wheel);capsules.push(c);}
 function beam(a,b,r,mat,parent=scene){const d=new T.Vector3().subVectors(b,a),o=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),6),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(o);return o;}
 beam(new T.Vector3(48,0,90),new T.Vector3(57,25,90),.42,mats.white);beam(new T.Vector3(66,0,90),new T.Vector3(57,25,90),.42,mats.white);
 function sign(label,w,h){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#102d44';x.fillRect(0,0,1024,256);x.fillStyle='#71eeee';x.fillRect(0,244,1024,12);x.textAlign='center';x.textBaseline='middle';x.font='700 80px system-ui';x.fillStyle='#f0ffff';x.fillText(label,512,115);x.font='500 26px system-ui';x.fillStyle='#8bdbe8';x.fillText('B A Y F R O N T   N I G H T   R A C E',512,204);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));}
 function gantry(s,label){const f=trackFrame(track,s),g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=Math.atan2(f.tx,f.tz);scene.add(g);box(.4,8.4,.5,-9,4.2,0,mats.navy,g);box(.4,8.4,.5,9,4.2,0,mats.navy,g);box(.1,7.8,.1,-8.8,4,0,mats.pink,g);box(.1,7.8,.1,8.8,4,0,mats.cyan,g);const p=sign(label,18.8,2.9);p.position.set(0,8.2,0);p.rotation.y=Math.PI;g.add(p);return g;}
 gantry(14,'SPEED GRAND PRIX');for(const sector of SECTORS.slice(1))gantry(length*sector.at,sector.sign);
 const startframe=trackFrame(track,0),startmarks=[];for(let row=0;row<2;row++)for(let col=0;col<16;col++){const f=trackFrame(track,row*.7),l=-7.5+col;startmarks.push({pos:[f.x+f.rx*l,.065,f.z+f.rz*l],scale:[.9,.018,.65],angle:Math.atan2(f.tx,f.tz),color:(row+col)%2?'#d7ecf5':'#243447'});}instances(unit,basic('#ffffff'),startmarks);


 const gltf=new GLTFLoader(),models={};
 const items=['building-e','building-h','building-n','building-skyscraper-a','building-skyscraper-b','building-skyscraper-c','building-skyscraper-d','tree_palmBend','tree_palmDetailedTall'];
 await Promise.all(items.map(async name=>{const asset=await gltf.loadAsync(new URL('./assets/'+name+'.glb',import.meta.url).href),ob=asset.scene;ob.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(ob),center=bounds.getCenter(new T.Vector3()),group=new T.Group();group.add(ob);ob.position.x-=center.x;ob.position.z-=center.z;ob.position.y-=bounds.min.y;models[name]=group;}));
 const buildings=items.filter(n=>n.startsWith('building'));
 function place(name,x,z,scale,rotation=0){const ob=models[name].clone(true);ob.position.set(x,.08,z);ob.scale.setScalar(scale);ob.rotation.y=rotation;scene.add(ob);return ob;}
 for(let i=0;i<30;i++){
  const s=i/30*length,f=trackFrame(track,s),side=i%3?1:-1;
  // Keep the bay side of the first straight open.
  const outer=(s<length*.23?-1:side),offset=25+(i%3)*9;
  const bx=f.x+f.rx*outer*offset,bz=f.z+f.rz*outer*offset;
  if(nearestTrack(track,bx,bz).distance>24)place(buildings[i%buildings.length],bx,bz,5+(i%4),Math.atan2(f.tx,f.tz));
 }
 for(let i=0;i<28;i++){
  const f=trackFrame(track,i/28*length);for(const side of [-1,1])place(i%2?'tree_palmBend':'tree_palmDetailedTall',f.x+f.rx*13.5*side,f.z+f.rz*13.5*side,3.5, i*.9);
 }

 // Instanced silhouettes add district variety without cloning more detailed models.
 const towers=[],roofs=[];
 for(let i=0;i<90;i++){const f=trackFrame(track,i/90*length),side=i%2?1:-1,offset=34+i%3*14,x=f.x+f.rx*side*offset,z=f.z+f.rz*side*offset;
  if(nearestTrack(track,x,z).distance<25||(f.x>-20&&side===1))continue;
  const garden=i/90>.46&&i/90<.63,h=garden?8+i%4*2:18+i*17%48,w=8+i%3*3;
  towers.push({pos:[x,h/2,z],scale:[w,h,12],angle:Math.atan2(f.tx,f.tz)});roofs.push({pos:[x,h+.15,z],scale:[w+.2,.25,12.2],angle:Math.atan2(f.tx,f.tz),color:garden?'#73e9ad':i%2?'#71eeee':'#ff7197'});
 }
 const shrubs=[],beds=[];for(let i=0;i<36;i++){const f=trackFrame(track,(.46+i/36*.17)*length);for(const side of [-1,1]){const x=f.x+f.rx*side*15,z=f.z+f.rz*side*15;if(nearestTrack(track,x,z).distance<13)continue;shrubs.push({pos:[x,1.5,z],scale:[2.5,1.5,2.5]});beds.push({pos:[x,.4,z],scale:[5,.8,5],angle:Math.atan2(f.tx,f.tz)});}}
 instances(new T.SphereGeometry(1,7,5),material('#397b64'),shrubs);instances(unit,mats.walk,beds);
 instances(unit,buildingMat,towers);instances(unit,basic('#ffffff'),roofs);
 return {groundHeight:()=>0,tick:dt=>{wheel.rotation.z+=dt*.035;capsules.forEach(c=>c.rotation.z=-wheel.rotation.z);},update(){},stats:()=>({kind:'city'})};
}
