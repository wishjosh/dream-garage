import * as T from '../../vendor/three.module.js';
import {trackFrame} from '../../race-core.mjs';
import {DATA} from './data.mjs';
import {terrainHeight,worldPoint,SITE,START_X} from './terrain.mjs';
import {PIT,HOLD_Z} from './pit.mjs';
import {SURFACE,cornerMarkers,pitSignal} from './trackside.mjs';
export function buildCampus(scene,track){
 scene.background=new T.Color('#adc6d5');scene.fog=new T.Fog('#adc6d5',470,1500);
 scene.add(new T.HemisphereLight('#e4f3ff','#445443',2));const sun=new T.DirectionalLight('#fff1d8',2.2);sun.position.set(-300,600,-180);scene.add(sun);
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.85,side:T.DoubleSide}),road=mat('#414b50'),runoff=mat('#839a95'),grass=mat('#607e60'),white=mat('#e9eee8'),navy=mat('#354e5f'),blue=mat('#548b9f'),unit=new T.BoxGeometry();
 const batches=new Map(),surfaceChecks=[];function box(x,y,z,w,h,d,m=navy,heading=0){const object=new T.Object3D();object.position.set(x,terrainHeight(x,z)+y,z);object.scale.set(w,h,d);object.rotation.y=heading;object.updateMatrix();if(!batches.has(m))batches.set(m,[]);batches.get(m).push(object.matrix.clone());}
 function mesh(points,index,material,offset=0){
 const vertices=[],indices=[];function tri(a,b,c,depth=0){const ab=Math.hypot(a.x-b.x,a.z-b.z),bc=Math.hypot(b.x-c.x,b.z-c.z),ca=Math.hypot(c.x-a.x,c.z-a.z),max=Math.max(ab,bc,ca);if(max>12&&depth<12){if(max===ab){const m={x:(a.x+b.x)/2,z:(a.z+b.z)/2};tri(a,m,c,depth+1);tri(m,b,c,depth+1);}else if(max===bc){const m={x:(b.x+c.x)/2,z:(b.z+c.z)/2};tri(a,b,m,depth+1);tri(a,m,c,depth+1);}else{const m={x:(c.x+a.x)/2,z:(c.z+a.z)/2};tri(a,b,m,depth+1);tri(m,b,c,depth+1);}}else{const i=vertices.length;vertices.push(a,b,c);indices.push(i,i+1,i+2);}}
 for(let i=0;i<index.length;i+=3)tri(points[index[i]],points[index[i+1]],points[index[i+2]]);points=vertices;index=indices;
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>[p.x,terrainHeight(p.x,p.z)+offset,p.z]),3));geo.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[p.x/7,p.z/7]),2));geo.setIndex(index);geo.computeVertexNormals();const m=new T.Mesh(geo,material);scene.add(m);return m;}
 function polygon(poly,material,offset){return mesh(poly,T.ShapeUtils.triangulateShape(poly.map(p=>new T.Vector2(p.x,p.z)),[]).flat(),material,offset);}
 const b={xmin:Math.min(...SITE.map(p=>p.x))-100,xmax:Math.max(...SITE.map(p=>p.x))+100,zmin:Math.min(...SITE.map(p=>p.z))-100,zmax:Math.max(...SITE.map(p=>p.z))+100},points=[],index=[],nx=110,nz=100;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){points.push({x:b.xmin+(b.xmax-b.xmin)*i/nx,z:b.zmin+(b.zmax-b.zmin)*j/nz});if(i<nx&&j<nz){const a=j*(nx+1)+i;index.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}}mesh(points,index,grass,SURFACE.grass);
 const outer=DATA.campus.outer.map(worldPoint),inner=DATA.campus.inner.map(worldPoint),strip=[],si=[];
 outer.forEach((p,i)=>{strip.push(p,inner[i]);const n=(i+1)%outer.length;si.push(i*2,n*2,i*2+1,i*2+1,n*2,n*2+1);});mesh(strip,si,runoff,.043);
 for(const c of DATA.corners)polygon(c.fan.map(worldPoint),runoff,.0435);
 function ribbon(path,width,material,offset){const pts=[],idx=[];for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);for(const side of [-1,1])pts.push({x:path[i].x+dz/len*width*side,z:path[i].z-dx/len*width*side});if(i<path.length-1)idx.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);}return mesh(pts,idx,material,offset);}
 new T.TextureLoader().load('./assets/materials/asphalt-color.jpg',texture=>{texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=2;road.map=texture;road.needsUpdate=true;});
 const roadPath=[...track.frames,track.frames[0]];ribbon(roadPath,8.2,road,SURFACE.road);ribbon(PIT,6,blue,SURFACE.pit);
 for(const side of [-1,1])ribbon(roadPath.map(p=>({x:p.x+p.rx*side*8,z:p.z+p.rz*side*8})),.09,white,.058);
 const curbs=new T.InstancedMesh(unit,white,Math.ceil(track.length/5)*2),o=new T.Object3D();let ci=0;
 for(let s=0;s<track.length;s+=5){const f=trackFrame(track,s),heading=Math.atan2(f.tx,f.tz);for(const side of [-1,1]){const x=f.x+f.rx*7.65*side,z=f.z+f.rz*7.65*side;o.position.set(x,terrainHeight(x,z)+.07,z);o.rotation.set(0,heading,0);o.scale.set(.55,.045,4.85);o.updateMatrix();curbs.setMatrixAt(ci,o.matrix);curbs.setColorAt(ci++,new T.Color(Math.round(s/5)%2?'#e9eee8':'#b44c46'));}}curbs.count=ci;scene.add(curbs);
 box(38,.065,430-START_X,12,.025,.4,white);box(16,.5,340-START_X,.6,1,180,white);
 for(let i=2;i<PIT.length-2;i+=3){const p=PIT[i];box(p.x,.06,p.z,.16,.025,2.2,white,Math.atan2(PIT[i+1].x-p.x,PIT[i+1].z-p.z));}
 const signCache=new Map();
 function label(text,x,z,height=3,width=20,heading=Math.PI,aspect=8,color='#173344'){
  const key=JSON.stringify([text,aspect,color]);let tex=signCache.get(key);
  if(!tex){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024/aspect);const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#c9d9d4';ctx.lineWidth=5;ctx.strokeRect(5,5,c.width-10,c.height-10);ctx.fillStyle='#f1f6ee';ctx.font='bold '+Math.floor(c.height*.55)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2,c.width-40);tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;signCache.set(key,tex);}
  const m=new T.Mesh(new T.PlaneGeometry(width,width/aspect),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,terrainHeight(x,z)+height,z);m.rotation.y=heading;m.name='trackside '+text;scene.add(m);return m;
 }
 const shutter=mat('#506774'),glass=mat('#233d4a'),roof=mat('#c7cfca'),seat=mat('#d2c5ab');
 let pitBays=0,standRows=0;
 for(const f of DATA.campus.facilities){const [x0,y0,x1,y1]=f.box,x=-(y0+y1)/2,z=(x0+x1)/2-START_X,w=y1-y0,d=x1-x0;
  if(f.id==='basin'){box(x,SURFACE.apron,z,w,.025,d,mat('#73959c'));continue;}
  if(f.id==='parking'){box(x,SURFACE.apron,z,w,.025,d,mat('#526b6c'));for(let i=0;i<12;i++)box(x,SURFACE.marking,z-d/2+10+i*18,w*.7,.02,.15,white);continue;}
  if(f.id==='stand'){
   // Seats rise away from the course; roof and columns remain within the footprint.
   for(let i=0;i<6;i++){const sx=x-w/2+2.8+i*5.5,h=1.1+i*.72;box(sx,h/2,z,5.5,h,d,navy);for(let row=0;row<2;row++){box(sx-1.6+row*2.5,h+.28,z,.65,.5,d-4,seat);standRows++;}}
   for(let iz=-d/2+7;iz<d/2;iz+=24)box(x+w/2-2,5.3,z+iz,.45,10.6,.45,navy);
   box(x,10.6,z,w,.35,d,roof);label('SPEED RING / GRANDSTAND',x-w/2-.05,z,8,Math.min(d-4,70),-Math.PI/2,12);continue;
  }
  const h=f.id==='pit'?6:f.id==='medical'?4:3;box(x,h/2,z,w,h,d,navy);box(x,h+.25,z,w+2,.5,d+2,roof);
  if(f.id==='pit'){
   // The apron connects the lane edge x=44 to the existing building front.
   const front=x-w/2;box((44+front)/2,SURFACE.apron,z,front-44,.025,d,runoff);
   for(let i=0;i<10;i++){const bz=z-d/2+8+i*16;box(front-.06,2.15,bz,.1,4.1,12,shutter);for(let j=1;j<5;j++)box(front-.13,j*.78,bz,.05,.045,12,white);label(String(i+1).padStart(2,'0'),front-.16,bz,5.1,2.4,-Math.PI/2,2);pitBays++;box(49,SURFACE.marking,bz,8,.02,.15,white);}
   box(front-2.5,4.65,z,5,.22,d,roof);
   box(x,8.25,z+d/2-16,w-6,4,24,navy);box(front+2.9,8.6,z+d/2-16,.2,2.2,22,glass);box(x,10.4,z+d/2-16,w-4,.3,26,roof);
   label('PIT / CONTROL',front-2.6,z,6,38,-Math.PI/2,10);
  }else{
   label(f.id==='medical'?'RECOVERY / OPERATIONS':'PADDOCK',x-w/2-.06,z,h*.65,Math.min(d-4,40),-Math.PI/2,10);
   for(let i=0;i<5;i++)box(x-w/2-.05,h*.48,z-d*.36+i*d*.18,.1,h*.55,d*.10,shutter);
  }
 }
 function access(path,width,material,name){const m=ribbon(path,width,material,SURFACE.access);m.name=name;const a=m.geometry.attributes.position.array;let min=Infinity;for(let i=0;i<a.length;i+=3)min=Math.min(min,a[i+1]-terrainHeight(a[i],a[i+2]));surfaceChecks.push({name,minHeightAboveTerrain:min});}
 for(const row of DATA.campus.roads)access(row.points.map(worldPoint),row.kind==='pedestrian'?2:4,mat(row.kind==='pedestrian'?'#bcbaa5':'#747e7e'),'access '+row.id);
 access(DATA.campus.service.map(worldPoint),3,mat('#8a8e7d'),'service road');
 for(let i=0;i<SITE.length;i++){const a=SITE[i],b=SITE[(i+1)%SITE.length],len=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(len/8);for(let j=0;j<count;j++)box(a.x+(b.x-a.x)*(j+.5)/count,.7,a.z+(b.z-a.z)*(j+.5)/count,.5,1.4,len/count+.1,white,Math.atan2(b.x-a.x,b.z-a.z));}
 const markers=cornerMarkers(track);
 for(const m of markers){label(m.label,m.x,m.z,1.65,3.8,m.heading,2.5);box(m.x,.65,m.z,.12,1.3,.12,navy);}
 label('PIT 50',46,160-START_X,2.5,6,Math.PI,2.5);label('PIT EXIT',38,HOLD_Z+2.26,5.65,8,Math.PI,6);
 for(const sx of [31,45])box(sx,2.5,HOLD_Z+2.4,.16,5,.16,navy);
 box(38,5,HOLD_Z+2.4,14,.16,.16,navy);
 const signalMeshes={};for(const [key,text,color] of [['idle','PIT 50','#344c59'],['approach','STOP 50','#71501c'],['wait','WAIT','#71501c'],['go','GO →','#1c5947']]){signalMeshes[key]=label(text,38,HOLD_Z+2.35,3.5,7,Math.PI,4,color);signalMeshes[key].visible=key==='idle';}
 label('MERGE →',24,500-START_X,1.8,5,Math.PI,3);
 label('SPEED RING',0,15,7,18);for(const side of [-1,1])box(9*side,3.5,15,.35,7,.35,navy);
 for(let row=0;row<2;row++)for(let i=0;i<16;i++)box(-7.5+i,.065,row*.7,.9,.02,.65,(row+i)%2?white:navy);
 const lamp=new T.Mesh(new T.SphereGeometry(.28,10,8),new T.MeshBasicMaterial({color:'#a7b7bd'}));lamp.position.set(42,3.5,HOLD_Z+2.25);scene.add(lamp);let signal=pitSignal(null,null);
 for(const [material,matrices] of batches){const inst=new T.InstancedMesh(unit,material,matrices.length);matrices.forEach((matrix,i)=>inst.setMatrixAt(i,matrix));inst.instanceMatrix.needsUpdate=true;scene.add(inst);}
 return{update:(merge,player)=>{signal=pitSignal(player,merge);lamp.material.color.set(signal.color);for(const [key,m] of Object.entries(signalMeshes))m.visible=key===signal.state;},stats:()=>({markers,pitBays,standRows,surfaceChecks,signal})};
}
