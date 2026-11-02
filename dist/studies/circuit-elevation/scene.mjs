import {paintDistanceBoard} from './distance-board.mjs?v=t1-readable-1';
import {signageLayout} from './signage.mjs';
import {STAND,PARKING,spectatorVariant,spectatorStats} from './spectators.mjs';
import {drawSpectators} from './spectator-scene.mjs';
import {FACILITY_BUILDINGS,FACILITY_YARDS,FACILITY_ACCESS,facilityStats,facilityVariant} from './facilities.mjs';
import {pitLayout,campusFacilities,layoutMeasurements} from './layout.mjs';
import {prepareCircuitArt,installCircuitProps} from './art.mjs';
import * as T from '../../vendor/three.module.js';
import {trackFrame} from '../../race-core.mjs';
import {DATA} from './data.mjs';
import {terrainHeight,worldPoint,SITE,START_X} from './terrain.mjs';
import {createPit,HOLD_Z} from './pit.mjs';
import {SURFACE,cornerMarkers,pitSignal,approachBoards} from './trackside.mjs?v=t1-readable-1';
export async function buildCampus(scene,track,{realism=true,renderer,layoutId='compact',facilities='split',spectators='scaled',signage='scaled',approach='before'}={}){
 const signs=signageLayout(signage);
 const facilityId=facilityVariant(facilities),spectatorId=spectatorVariant(spectators);
 const layout=pitLayout(layoutId),{PIT}=createPit(layout),pitX=layout.centerX,laneEdge=pitX+layout.halfWidth;
 const art=realism?await prepareCircuitArt():null;
 scene.background=new T.Color(realism?'#c6d0d4':'#adc6d5');scene.fog=new T.Fog(realism?'#c6d0d4':'#adc6d5',470,1500);
 scene.add(new T.HemisphereLight(realism?'#e8edf1':'#e4f3ff',realism?'#797363':'#445443',realism?1.25:2));const sun=new T.DirectionalLight('#fff1d8',2.2);sun.position.set(...(realism?[-120,150,-180]:[-300,600,-180]));scene.add(sun);if(realism){sun.target.position.set(35,0,-70);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-160,right:160,top:160,bottom:-160,near:1,far:600});sun.shadow.bias=-.001;sun.shadow.normalBias=.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;scene.environmentIntensity=.45;}
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.85,side:T.DoubleSide}),road=art?new T.MeshStandardMaterial({...art.road,color:'#e0dfda',roughness:1}):mat('#414b50'),runoff=mat(art?'#807e73':'#839a95'),grass=art?new T.MeshStandardMaterial({...art.ground,color:'#ffffff',roughness:1,normalScale:new T.Vector2(.7,.7)}):mat('#607e60'),white=mat('#e9eee8'),navy=art?art.concrete:mat('#354e5f'),blue=art?new T.MeshStandardMaterial({...art.road,color:'#c9c7c0',roughness:1}):mat('#548b9f'),unit=new T.BoxGeometry();
 const batches=new Map(),surfaceChecks=[];function box(x,y,z,w,h,d,m=navy,heading=0){const object=new T.Object3D();object.position.set(x,terrainHeight(x,z)+y,z);object.scale.set(w,h,d);object.rotation.y=heading;object.updateMatrix();if(!batches.has(m))batches.set(m,[]);batches.get(m).push(object.matrix.clone());}
 function mesh(points,index,material,offset=0){
 const vertices=[],indices=[];function tri(a,b,c,depth=0){const ab=Math.hypot(a.x-b.x,a.z-b.z),bc=Math.hypot(b.x-c.x,b.z-c.z),ca=Math.hypot(c.x-a.x,c.z-a.z),max=Math.max(ab,bc,ca);if(max>12&&depth<12){if(max===ab){const m={x:(a.x+b.x)/2,z:(a.z+b.z)/2};tri(a,m,c,depth+1);tri(m,b,c,depth+1);}else if(max===bc){const m={x:(b.x+c.x)/2,z:(b.z+c.z)/2};tri(a,b,m,depth+1);tri(a,m,c,depth+1);}else{const m={x:(c.x+a.x)/2,z:(c.z+a.z)/2};tri(a,b,m,depth+1);tri(m,b,c,depth+1);}}else{const i=vertices.length;vertices.push(a,b,c);indices.push(i,i+1,i+2);}}
 for(let i=0;i<index.length;i+=3)tri(points[index[i]],points[index[i+1]],points[index[i+2]]);points=vertices;index=indices;
 if(realism)for(let i=0;i<index.length;i+=3){const a=points[index[i]],b=points[index[i+1]],c=points[index[i+2]];if((b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z)<0)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>[p.x,terrainHeight(p.x,p.z)+offset,p.z]),3));geo.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[p.x/7,p.z/7]),2));geo.setIndex(index);geo.computeVertexNormals();const m=new T.Mesh(geo,material);m.receiveShadow=realism;scene.add(m);return m;}
 function polygon(poly,material,offset){return mesh(poly,T.ShapeUtils.triangulateShape(poly.map(p=>new T.Vector2(p.x,p.z)),[]).flat(),material,offset);}
 const b={xmin:Math.min(...SITE.map(p=>p.x))-100,xmax:Math.max(...SITE.map(p=>p.x))+100,zmin:Math.min(...SITE.map(p=>p.z))-100,zmax:Math.max(...SITE.map(p=>p.z))+100},points=[],index=[],nx=110,nz=100;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){points.push({x:b.xmin+(b.xmax-b.xmin)*i/nx,z:b.zmin+(b.zmax-b.zmin)*j/nz});if(i<nx&&j<nz){const a=j*(nx+1)+i;index.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}}mesh(points,index,grass,SURFACE.grass);
 const outer=DATA.campus.outer.map(worldPoint),inner=DATA.campus.inner.map(worldPoint),strip=[],si=[];
 outer.forEach((p,i)=>{strip.push(p,inner[i]);const n=(i+1)%outer.length;si.push(i*2,n*2,i*2+1,i*2+1,n*2,n*2+1);});mesh(strip,si,runoff,.043);
 for(const c of DATA.corners)polygon(c.fan.map(worldPoint),runoff,.0435);
 function ribbon(path,width,material,offset){const pts=[],idx=[];for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);for(const side of [-1,1])pts.push({x:path[i].x+dz/len*width*side,z:path[i].z-dx/len*width*side});if(i<path.length-1)idx.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);}return mesh(pts,idx,material,offset);}
 if(!art)new T.TextureLoader().load('./assets/materials/asphalt-color.jpg',texture=>{texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=2;road.map=texture;road.needsUpdate=true;});
 const roadPath=[...track.frames,track.frames[0]];ribbon(roadPath,8.2,road,SURFACE.road);ribbon(PIT,6,blue,SURFACE.pit);
 for(const side of [-1,1])ribbon(roadPath.map(p=>({x:p.x+p.rx*side*8,z:p.z+p.rz*side*8})),.09,white,.058);
 const curbs=new T.InstancedMesh(unit,white,Math.ceil(track.length/5)*2),o=new T.Object3D();let ci=0;
 for(let s=0;s<track.length;s+=5){const f=trackFrame(track,s),heading=Math.atan2(f.tx,f.tz);for(const side of [-1,1]){const x=f.x+f.rx*7.65*side,z=f.z+f.rz*7.65*side;o.position.set(x,terrainHeight(x,z)+.07,z);o.rotation.set(0,heading,0);o.scale.set(.55,.045,4.85);o.updateMatrix();curbs.setMatrixAt(ci,o.matrix);curbs.setColorAt(ci++,new T.Color(Math.round(s/5)%2?'#e9eee8':'#b44c46'));}}curbs.count=ci;scene.add(curbs);
 box(pitX,.065,430-START_X,12,.025,.4,white);if(!art)box(layout.separatorX,.5,340-START_X,.6,1,180,white);
 for(let i=2;i<PIT.length-2;i+=3){const p=PIT[i];box(p.x,.06,p.z,.16,.025,2.2,white,Math.atan2(PIT[i+1].x-p.x,PIT[i+1].z-p.z));}
 const signCache=new Map();
 function label(text,x,z,height=3,width=20,heading=Math.PI,aspect=8,color='#173344',ink='#f1f6ee',readable=false){
  const key=JSON.stringify([text,aspect,color,ink,readable]);let tex=signCache.get(key);
  if(!tex){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024/aspect);const ctx=c.getContext('2d');if(readable){paintDistanceBoard(ctx,text,c.width,c.height);}else{ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#c9d9d4';ctx.lineWidth=5;ctx.strokeRect(5,5,c.width-10,c.height-10);ctx.fillStyle=ink;ctx.font='bold '+Math.floor(c.height*.55)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2,c.width-40);}tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;if(readable)tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());signCache.set(key,tex);}
  const m=new T.Mesh(new T.PlaneGeometry(width,width/aspect),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:!readable}));m.position.set(x,terrainHeight(x,z)+height,z);m.rotation.y=heading;m.name='trackside '+text;scene.add(m);return m;
 }
 const shutter=mat(art?'#686761':'#506774'),glass=new T.MeshStandardMaterial({color:art?'#4c5558':'#233d4a',roughness:.25,metalness:.35}),roof=mat(art?'#9c9b96':'#c7cfca'),seat=mat(art?'#5b6266':'#d2c5ab');

 function localBuilding(f){
  const [a,b,c,d]=f.box,front=-d,x=-(b+d)/2,z=(a+c)/2-START_X,depth=d-b,length=c-a,h=f.height;
  box(x,h/2,z,depth,h,length,navy);box(x,h+.12,z,depth+1,.24,length+1,roof);
  // Signs occupy the strip above doors, with no overlap or below-ground panels.
  label(f.name,front-.14,z,h-.45,f.kind==='office'?5.6:6,-Math.PI/2,10);
  if(f.kind==='workshop'){
   for(let i=0;i<f.bays;i++){const bz=a-START_X+(i+.5)*length/f.bays;
    box(front-.065,.1+f.doorHeight/2,bz,.1,f.doorHeight,f.doorWidth,shutter);
    for(let j=1;j<6;j++)box(front-.125,.1+j*f.doorHeight/6,bz,.035,.025,f.doorWidth,white);
    label(String(i+1).padStart(2,'0'),front-.15,bz,f.doorHeight+.27,.6,-Math.PI/2,2);
    // Short apron alignment marks, leaving the circulation strip clear.
    for(const side of [-1,1])box(front-4,SURFACE.marking,bz+side*f.doorWidth/2,7,.02,.10,white);
   }
   box(front-1,h-.05,z,2,.15,length,roof);
  }else{
   box(front-.07,1.18,z,.10,2.16,1.2,shutter);
   for(const dz of [-8,-4,4,8]){box(front-.08,2,z+dz,.12,1.2,2.2,glass);box(front-.16,1.36,z+dz,.25,.10,2.35,roof);}
   box(front-1,2.7,z,2.2,.12,2.4,roof);
  }
 }
 function facilityZone(id){
  const yard=FACILITY_YARDS.find(f=>f.id===id),[a,b,c,d]=yard.box,x=-(b+d)/2,z=(a+c)/2-START_X;
  polygon([[a,b],[c,b],[c,d],[a,d]].map(worldPoint),art?road:runoff,SURFACE.apron);
  // A continuous open circulation strip reaches the existing operations entrance.
  for(const f of FACILITY_BUILDINGS.filter(f=>f.zone===id))localBuilding(f);
  if(id==='paddock'){
   // Preparation bays: 4 m by 7 m, outside the door aprons and through lane.
   for(let i=0;i<8;i++){const bz=282+i*9-START_X;for(const side of [-1,1])box(169,SURFACE.marking,bz+side*2,7,.02,.10,white);box(172.5,SURFACE.marking,bz,.10,.02,4,white);}
  }else{
   for(let i=0;i<3;i++){const bz=718+i*7-START_X;for(const side of [-1,1])box(169,SURFACE.marking,bz+side*1.5,6,.02,.10,white);box(172,SURFACE.marking,bz,.10,.02,3,white);}
  }
 }
 const spectatorDrawing=drawSpectators({box,label,polygon,worldPoint,start:START_X,surface:SURFACE,road,concrete:navy,roof,seat,white,dark:shutter});
 let pitBays=0,standRows=0;
 for(const f of campusFacilities(layout)){const [x0,y0,x1,y1]=f.box,x=-(y0+y1)/2,z=(x0+x1)/2-START_X,w=y1-y0,d=x1-x0;
  if(facilityId==='split'&&['paddock','medical'].includes(f.id)){facilityZone(f.id);continue;}
  if(f.id==='basin'){box(x,SURFACE.apron,z,w,.025,d,mat('#73959c'));continue;}
  if(spectatorId==='scaled'&&f.id==='stand'){standRows=spectatorDrawing.stand().rows;continue;}
  if(spectatorId==='scaled'&&f.id==='parking'){spectatorDrawing.parking();continue;}
  if(f.id==='parking'){box(x,SURFACE.apron,z,w,.025,d,mat('#526b6c'));for(let i=0;i<12;i++)box(x,SURFACE.marking,z-d/2+10+i*18,w*.7,.02,.15,white);continue;}
  if(f.id==='stand'){
   // Seats rise away from the course; roof and columns remain within the footprint.
   for(let i=0;i<6;i++){const sx=x-w/2+2.8+i*5.5,h=1.1+i*.72;box(sx,h/2,z,5.5,h,d,navy);for(let row=0;row<2;row++){box(sx-1.6+row*2.5,h+.28,z,.65,.5,d-4,seat);standRows++;}}
   for(let iz=-d/2+7;iz<d/2;iz+=24)box(x+w/2-2,5.3,z+iz,.45,10.6,.45,navy);
   box(x,10.6,z,w,.35,d,roof);label('SPEED RING / GRANDSTAND',x-w/2-.05,z,8,Math.min(d-4,70),-Math.PI/2,12);continue;
  }
  const h=f.id==='pit'?layout.height:f.id==='medical'?4:3;box(x,h/2,z,w,h,d,navy);box(x,h+.25,z,w+2,.5,d+2,roof);
  if(f.id==='pit'){
   const small=layout.id==='compact',front=x-w/2,doorH=layout.doorHeight,doorW=layout.doorWidth;
   box((laneEdge+front)/2,SURFACE.apron,z,front-laneEdge,.025,d,runoff);
   for(let i=0;i<10;i++){const bz=z-d/2+layout.bayPitch/2+i*layout.bayPitch;
    box(front-.06,doorH/2+.1,bz,.1,doorH,doorW,shutter);for(let j=1;j<5;j++)box(front-.13,j*(small?doorH/5:.78),bz,.05,.045,doorW,white);
    label(String(i+1).padStart(2,'0'),front-.16,bz,small?3.85:5.1,small?1.3:2.4,-Math.PI/2,2);pitBays++;
    box(laneEdge+(front-laneEdge)*.36,SURFACE.marking,bz,small?4:8,.02,.15,white);
   }
   box(front-(small?1.25:2.5),small?3.6:4.65,z,small?2.5:5,.22,d,roof);
   const controlD=small?14:24,controlH=small?2.8:4,controlZ=z+d/2-(small?9:16),controlY=h+.25+controlH/2;
   box(x,controlY,controlZ,w-6,controlH,controlD,navy);box(front+2.9,controlY+.35,controlZ,.2,small?1.6:2.2,controlD-2,glass);box(x,h+.4+controlH,controlZ,w-4,.3,controlD+2,roof);
   label('PIT / CONTROL',front-(small?1.35:2.6),z,small?4.5:6,small?16:38,-Math.PI/2,10);
  }else{
   label(f.id==='medical'?'RECOVERY / OPERATIONS':'PADDOCK',x-w/2-.06,z,h*.65,Math.min(d-4,40),-Math.PI/2,10);
   for(let i=0;i<5;i++)box(x-w/2-.05,h*.48,z-d*.36+i*d*.18,.1,h*.55,d*.10,shutter);
  }
 }
 function access(path,width,material,name){const m=ribbon(path,width,material,SURFACE.access);m.name=name;const a=m.geometry.attributes.position.array;let min=Infinity;for(let i=0;i<a.length;i+=3)min=Math.min(min,a[i+1]-terrainHeight(a[i],a[i+2]));surfaceChecks.push({name,minHeightAboveTerrain:min});}
 for(const row of DATA.campus.roads)access((spectatorId==='scaled'&&row.id==='pedestrian'?[[40,-103],[40,-129]]:row.points).map(worldPoint),row.kind==='pedestrian'?2:4,mat(row.kind==='pedestrian'?'#bcbaa5':'#747e7e'),'access '+row.id);
 if(facilityId==='split')for(const r of FACILITY_ACCESS)access(r.points.map(worldPoint),r.halfWidth,road,r.id);
 if(spectatorId==='scaled')for(const [i,r] of PARKING.access.entries())access(r.points.map(worldPoint),4,road,'visitor access '+i);
 access(DATA.campus.service.map(worldPoint),3,mat('#8a8e7d'),'service road');
 for(let i=0;i<SITE.length;i++){const a=SITE[i],b=SITE[(i+1)%SITE.length],len=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(len/8);for(let j=0;j<count;j++)box(a.x+(b.x-a.x)*(j+.5)/count,.7,a.z+(b.z-a.z)*(j+.5)/count,.5,1.4,len/count+.1,white,Math.atan2(b.x-a.x,b.z-a.z));}
 const boards=['distance','readable'].includes(approach)?approachBoards(track,approach):[];
 for(const m of boards){label(String(m.distance),m.x,m.z,m.centreHeight,m.width,m.heading,m.width/m.height,'#e8e7df','#15191b',approach==='readable');box(m.x,.35,m.z,.07,.7,.07,navy);}
 const markers=cornerMarkers(track);
 for(const m of markers){label(m.label,m.x,m.z,signs.corner.height,signs.corner.width,m.heading,signs.corner.aspect);box(m.x,.65,m.z,.12,1.3,.12,navy);}
 label('PIT 50',pitX+8,160-START_X,signs.entry.height,signs.entry.width,Math.PI,signs.entry.aspect);label('PIT EXIT',pitX,HOLD_Z+2.26,signs.exit.height,signs.exit.width,Math.PI,signs.exit.aspect);
 if(signs.id==='scaled')box(pitX+8,.8,160-START_X,.10,1.6,.10,navy);
 for(const sx of [pitX-7,pitX+7])box(sx,2.5,HOLD_Z+2.4,.16,5,.16,navy);
 box(pitX,5,HOLD_Z+2.4,14,.16,.16,navy);
 const signalMeshes={};for(const [key,text,color] of [['idle','PIT 50','#344c59'],['approach','STOP 50','#71501c'],['wait','WAIT','#71501c'],['go','GO →','#1c5947']]){signalMeshes[key]=label(text,pitX,HOLD_Z+2.35,signs.signal.height,signs.signal.width,Math.PI,signs.signal.aspect,color);signalMeshes[key].visible=key==='idle';}
 label('MERGE →',24*pitX/38,500-START_X,signs.merge.height,signs.merge.width,Math.PI,signs.merge.aspect);
 if(signs.id==='scaled'){box(24*pitX/38,.8,500-START_X,.10,1.6,.10,navy);for(const side of [-1,1])box(pitX+side*1.4,4.45,HOLD_Z+2.4,.06,1.1,.06,navy);}
 label('SPEED RING',0,15,7,18);for(const side of [-1,1])box(9*side,3.5,15,.35,7,.35,navy);
 for(let row=0;row<2;row++)for(let i=0;i<16;i++)box(-7.5+i,.065,row*.7,.9,.02,.65,(row+i)%2?white:navy);
 const lamp=new T.Mesh(new T.SphereGeometry(.28,10,8),new T.MeshBasicMaterial({color:'#a7b7bd'}));lamp.position.set(pitX+4,3.5,HOLD_Z+2.25);scene.add(lamp);let signal=pitSignal(null,null);
 for(const [material,matrices] of batches){const inst=new T.InstancedMesh(unit,material,matrices.length);matrices.forEach((matrix,i)=>inst.setMatrixAt(i,matrix));inst.instanceMatrix.needsUpdate=true;inst.castShadow=realism&&material!==runoff&&material!==white;inst.receiveShadow=realism;scene.add(inst);}
 const artStats=art?installCircuitProps(scene,art,layout):{source:'baseline'};if(realism)renderer.shadowMap.needsUpdate=true;
 return{update:(merge,player)=>{signal=pitSignal(player,merge);lamp.material.color.set(signal.color);for(const [key,m] of Object.entries(signalMeshes))m.visible=key===signal.state;},stats:()=>({approach:{id:approach,boards},signage:signs,layout:layoutMeasurements(layout),facilities:facilityStats(facilityId),spectators:spectatorStats(spectatorId),art:artStats,markers,pitBays,standRows,surfaceChecks,signal})};
}
