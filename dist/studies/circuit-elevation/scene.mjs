import * as T from '../../vendor/three.module.js';
import {trackFrame} from '../../race-core.mjs';
import {DATA} from './data.mjs';
import {terrainHeight,worldPoint,SITE,START_X} from './terrain.mjs';
import {PIT,HOLD_Z} from './pit.mjs';
export function buildCampus(scene,track){
 scene.background=new T.Color('#adc6d5');scene.fog=new T.Fog('#adc6d5',470,1500);
 scene.add(new T.HemisphereLight('#e4f3ff','#445443',2));const sun=new T.DirectionalLight('#fff1d8',2.2);sun.position.set(-300,600,-180);scene.add(sun);
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.85,side:T.DoubleSide}),road=mat('#414b50'),runoff=mat('#839a95'),grass=mat('#607e60'),white=mat('#e9eee8'),navy=mat('#354e5f'),blue=mat('#548b9f'),unit=new T.BoxGeometry();
 const batches=new Map();function box(x,y,z,w,h,d,m=navy,heading=0){const object=new T.Object3D();object.position.set(x,terrainHeight(x,z)+y,z);object.scale.set(w,h,d);object.rotation.y=heading;object.updateMatrix();if(!batches.has(m))batches.set(m,[]);batches.get(m).push(object.matrix.clone());}
 function mesh(points,index,material,offset=0){
 const vertices=[],indices=[];function tri(a,b,c,depth=0){const ab=Math.hypot(a.x-b.x,a.z-b.z),bc=Math.hypot(b.x-c.x,b.z-c.z),ca=Math.hypot(c.x-a.x,c.z-a.z),max=Math.max(ab,bc,ca);if(max>12&&depth<12){if(max===ab){const m={x:(a.x+b.x)/2,z:(a.z+b.z)/2};tri(a,m,c,depth+1);tri(m,b,c,depth+1);}else if(max===bc){const m={x:(b.x+c.x)/2,z:(b.z+c.z)/2};tri(a,b,m,depth+1);tri(a,m,c,depth+1);}else{const m={x:(c.x+a.x)/2,z:(c.z+a.z)/2};tri(a,b,m,depth+1);tri(m,b,c,depth+1);}}else{const i=vertices.length;vertices.push(a,b,c);indices.push(i,i+1,i+2);}}
 for(let i=0;i<index.length;i+=3)tri(points[index[i]],points[index[i+1]],points[index[i+2]]);points=vertices;index=indices;
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>[p.x,terrainHeight(p.x,p.z)+offset,p.z]),3));geo.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[p.x/7,p.z/7]),2));geo.setIndex(index);geo.computeVertexNormals();const m=new T.Mesh(geo,material);scene.add(m);return m;}
 function polygon(poly,material,offset){return mesh(poly,T.ShapeUtils.triangulateShape(poly.map(p=>new T.Vector2(p.x,p.z)),[]).flat(),material,offset);}
 const b={xmin:Math.min(...SITE.map(p=>p.x))-100,xmax:Math.max(...SITE.map(p=>p.x))+100,zmin:Math.min(...SITE.map(p=>p.z))-100,zmax:Math.max(...SITE.map(p=>p.z))+100},points=[],index=[],nx=110,nz=100;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){points.push({x:b.xmin+(b.xmax-b.xmin)*i/nx,z:b.zmin+(b.zmax-b.zmin)*j/nz});if(i<nx&&j<nz){const a=j*(nx+1)+i;index.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}}mesh(points,index,grass,.042);
 const outer=DATA.campus.outer.map(worldPoint),inner=DATA.campus.inner.map(worldPoint),strip=[],si=[];
 outer.forEach((p,i)=>{strip.push(p,inner[i]);const n=(i+1)%outer.length;si.push(i*2,n*2,i*2+1,i*2+1,n*2,n*2+1);});mesh(strip,si,runoff,.043);
 for(const c of DATA.corners)polygon(c.fan.map(worldPoint),runoff,.0435);
 function ribbon(path,width,material,offset){const pts=[],idx=[];for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);for(const side of [-1,1])pts.push({x:path[i].x+dz/len*width*side,z:path[i].z-dx/len*width*side});if(i<path.length-1)idx.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);}return mesh(pts,idx,material,offset);}
 new T.TextureLoader().load('./assets/materials/asphalt-color.jpg',texture=>{texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=2;road.map=texture;road.needsUpdate=true;});
 const roadPath=[...track.frames,track.frames[0]];ribbon(roadPath,8.2,road,.045);ribbon(PIT,6,blue,.044);
 for(const side of [-1,1])ribbon(roadPath.map(p=>({x:p.x+p.rx*side*8,z:p.z+p.rz*side*8})),.09,white,.058);
 const curbs=new T.InstancedMesh(unit,white,Math.ceil(track.length/5)*2),o=new T.Object3D();let ci=0;
 for(let s=0;s<track.length;s+=5){const f=trackFrame(track,s),heading=Math.atan2(f.tx,f.tz);for(const side of [-1,1]){const x=f.x+f.rx*7.65*side,z=f.z+f.rz*7.65*side;o.position.set(x,terrainHeight(x,z)+.07,z);o.rotation.set(0,heading,0);o.scale.set(.55,.045,4.85);o.updateMatrix();curbs.setMatrixAt(ci,o.matrix);curbs.setColorAt(ci++,new T.Color(Math.round(s/5)%2?'#e9eee8':'#b44c46'));}}curbs.count=ci;scene.add(curbs);
 box(38,.065,430-START_X,12,.025,.4,white);box(16,.5,340-START_X,.6,1,180,white);
 for(let i=2;i<PIT.length-2;i+=3){const p=PIT[i];box(p.x,.06,p.z,.16,.025,2.2,white,Math.atan2(PIT[i+1].x-p.x,PIT[i+1].z-p.z));}
 function label(text,x,z,height=3,width=20){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#173344';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#f1f6ee';ctx.font='bold 52px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/8),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,terrainHeight(x,z)+height,z);m.rotation.y=Math.PI;scene.add(m);return m;}
 for(const f of DATA.campus.facilities){const [x0,y0,x1,y1]=f.box,x=-(y0+y1)/2,z=(x0+x1)/2-START_X,w=y1-y0,d=x1-x0;
  if(f.id==='basin'){box(x,.025,z,w,.035,d,mat('#73959c'));continue;}
  if(f.id==='parking'){box(x,.025,z,w,.035,d,mat('#526b6c'));for(let i=0;i<12;i++)box(x,.055,z-d/2+10+i*18,w*.7,.02,.15,white);continue;}
  if(f.id==='stand'){for(let i=0;i<5;i++)box(x-w/2+3+i*6,1+i*.8,z,6,2+i*1.6,d,mat(i%2?'#9a665d':'#b9c5c7'));continue;}
  const h=f.id==='pit'?6:f.id==='medical'?4:3;box(x,h/2,z,w,h,d,navy);box(x,h+.25,z,w+2,.5,d+2,white);label(f.id==='pit'?'PIT / CONTROL':f.id==='medical'?'RECOVERY':'PADDOCK',x,z,h+2,Math.min(d,38));
 }
 for(const row of DATA.campus.roads)ribbon(row.points.map(worldPoint),4,mat('#7b827a'),.008);
 ribbon(DATA.campus.service.map(worldPoint),3,mat('#8a8e7d'),.006);
 for(let i=0;i<SITE.length;i++){const a=SITE[i],b=SITE[(i+1)%SITE.length],len=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(len/8);for(let j=0;j<count;j++)box(a.x+(b.x-a.x)*(j+.5)/count,.7,a.z+(b.z-a.z)*(j+.5)/count,.5,1.4,len/count+.1,white,Math.atan2(b.x-a.x,b.z-a.z));}
 for(let s=40;s<track.length;s+=140){const f=trackFrame(track,s),next=trackFrame(track,s+30),curve=Math.abs(Math.atan2(f.tx*next.tz-f.tz*next.tx,f.tx*next.tx+f.tz*next.tz));if(curve>.015){const side=(f.tx*next.tz-f.tz*next.tx)>0?1:-1,x=f.x+f.rx*side*11,z=f.z+f.rz*side*11,sign=label('> >',x,z,1.5,3);sign.rotation.y=Math.atan2(f.tx,f.tz)+Math.PI;}}
 label('PIT 50 / WAIT',47,HOLD_Z-2,2.4,10);label('SPEED RING',0,15,7,18);for(const side of [-1,1])box(9*side,3.5,15,.35,7,.35,navy);
 for(let row=0;row<2;row++)for(let i=0;i<16;i++)box(-7.5+i,.065,row*.7,.9,.02,.65,(row+i)%2?white:navy);
 const lamp=new T.Mesh(new T.SphereGeometry(.35,10,8),new T.MeshBasicMaterial({color:'#f1b650'}));lamp.position.set(45,2.2,HOLD_Z+3);scene.add(lamp);
 for(const [material,matrices] of batches){const inst=new T.InstancedMesh(unit,material,matrices.length);matrices.forEach((matrix,i)=>inst.setMatrixAt(i,matrix));inst.instanceMatrix.needsUpdate=true;scene.add(inst);}
 return{update:state=>lamp.material.color.set(state?.clear?'#65d19c':'#f1b650')};
}
