import * as T from '../../vendor/three.module.js';
import {itemById} from './art-core.mjs';
export function disposeArt(model){const a=model?.userData.artOwned;if(a){a.geometry.forEach(g=>g.dispose());a.materials.forEach(m=>m.dispose());}}
export function dressArt(model,car,loadout,rig,finish='refined'){
 const geometry=[],materials=[],paint=itemById(loadout.paint),wheel=itemById(loadout.wheels);
 const ownGeo=g=>(geometry.push(g),g),ownMat=m=>(materials.push(m),m);
 if(finish==='before'){
 if(paint.color)model.traverse(o=>{if(!o.isMesh)return;const recolor=source=>{if(source.name!=='CarSurface')return source;const m=ownMat(new T.MeshPhysicalMaterial({name:'study-clearcoat',color:paint.color,metalness:paint.metalness,roughness:paint.roughness,clearcoat:1,clearcoatRoughness:.18,envMapIntensity:.48}));if(paint.metalness>.1){m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 float grain = fract(sin(dot(floor(vViewPosition.xy*2300.0),vec2(12.9898,78.233)))*43758.5453);
 roughnessFactor = clamp(roughnessFactor + (grain-.5)*.035,.05,1.0);`);};m.customProgramCacheKey=()=>paint.id;}return m;};o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material);});
 }else{
 if(finish==='refined')model.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];if(!ms.some(m=>m.name==='CarSurface'))return;
  const original=o.geometry,geo=original.clone(),positions=geo.attributes.position,normals=geo.attributes.normal;if(!positions||!normals){geo.dispose();return;}
  const groups=new Map();for(let i=0;i<positions.count;i++){const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(x=>Math.round(x*1e5)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
  const source=normals.array.slice(),threshold=Math.cos(T.MathUtils.degToRad(28));let changed=0;
  for(const ids of groups.values())for(const i of ids){const n=new T.Vector3().fromArray(source,i*3),sum=new T.Vector3();for(const j of ids){const other=new T.Vector3().fromArray(source,j*3);if(n.dot(other)>threshold)sum.add(other);}sum.normalize();if(n.dot(sum)<.99999)changed++;normals.setXYZ(i,sum.x,sum.y,sum.z);}
  normals.needsUpdate=true;geo.userData.studyNormalCorrections=changed;o.geometry=ownGeo(geo);
 });
 if(finish==='refined')model.traverse(o=>{if(!o.isMesh)return;const recolor=source=>{
  if(source.name==='Glass')return ownMat(new T.MeshPhysicalMaterial({name:'study-glass',color:'#101921',metalness:0,roughness:.12,clearcoat:.45,clearcoatRoughness:.12,envMapIntensity:.8,side:source.side}));
  if(source.name==='Doorstep')return ownMat(new T.MeshStandardMaterial({name:'study-trim',color:'#151a1f',metalness:.15,roughness:.57,side:source.side}));
  if(source.name==='Material.001')return ownMat(new T.MeshStandardMaterial({name:'study-mirror',color:'#6b7781',metalness:1,roughness:.12,envMapIntensity:.7,side:source.side}));
  if(source.name!=='CarSurface'||!paint.color)return source;
  const m=ownMat(new T.MeshPhysicalMaterial({name:'study-clearcoat',color:paint.color,metalness:paint.metalness,roughness:.31,clearcoat:.35,clearcoatRoughness:.13,envMapIntensity:.7,side:source.side}));
  return m;
 };o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material);});
 }
 if(wheel.kind){
 const metal=ownMat(new T.MeshStandardMaterial({color:wheel.color,metalness:.88,roughness:wheel.kind==='split'?.34:.24})),edge=ownMat(new T.MeshStandardMaterial({color:wheel.kind==='split'?'#87929e':'#d8dde0',metalness:.95,roughness:.19})),dark=ownMat(new T.MeshStandardMaterial({color:'#222831',metalness:.65,roughness:.4})),rotor=ownMat(new T.MeshStandardMaterial({color:'#676c73',metalness:.7,roughness:.6})),hole=ownMat(new T.MeshBasicMaterial({color:'#1d2328'})),caliperMat=ownMat(new T.MeshStandardMaterial({color:'#a81721',roughness:.42,metalness:.25}));
 const invisible=ownMat(new T.MeshBasicMaterial({visible:false}));
 const rimRadius=.282,hubRadius=.052;
 function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(ownGeo(g),m);o.position.set(x,y,z);parent.add(o);return o;}
 function spoke(parent,points){const shape=new T.Shape();shape.moveTo(...points[0]);for(const v of points.slice(1))shape.lineTo(...v);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.003});const a=g.attributes.position;for(let i=0;i<a.count;i++){const r=Math.hypot(a.getX(i),a.getY(i));a.setZ(i,a.getZ(i)-.045+Math.min(1,r/rimRadius)*.04);}g.computeVertexNormals();return mesh(parent,g,[edge,metal]);}
 function polar(r,a){return[Math.cos(a)*r,Math.sin(a)*r];}
 for(const info of rig.wheels){const w=model.getObjectByName(info.name);if(!w)continue;
 w.traverse(o=>{if(!o.isMesh)return;const hide=m=>m.name==='Disks'?invisible:m;o.material=Array.isArray(o.material)?o.material.map(hide):hide(o.material);});
 const group=new T.Group();group.name='study-replacement-wheel';group.position.x=Math.sign(info.position[0])*.145;group.rotation.y=Math.sign(info.position[0])*Math.PI/2;w.add(group);
 const barrel=mesh(group,new T.CylinderGeometry(.274,.274,.11,48,1,true),dark,0,0,-.045);barrel.rotation.x=Math.PI/2;
 mesh(group,new T.TorusGeometry(rimRadius,.008,6,64),edge);
 mesh(group,new T.TorusGeometry(.266,.004,4,64),metal,0,0,-.012);
 mesh(group,new T.RingGeometry(.055,.227,64),rotor,0,0,-.079);
 const holes=new T.InstancedMesh(ownGeo(new T.CircleGeometry(.0045,6)),hole,48),dummy=new T.Object3D();for(let i=0;i<48;i++){const a=i*Math.PI*2/24,r=i<24?.183:.209;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,-.077);dummy.updateMatrix();holes.setMatrixAt(i,dummy.matrix);}group.add(holes);
 const caliper=mesh(group,new T.BoxGeometry(.055,.126,.04),caliperMat,-.197,.01,-.052);caliper.rotation.z=-.1;

 if(wheel.kind==='five')for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const o=spoke(group,[[.045,-.015],[.13,-.018],[.258,-.027],[.272,-.018],[.272,.02],[.235,.027],[.13,.018],[.045,.015]]);o.rotation.z=a;}
 if(wheel.kind==='split')for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const stem=spoke(group,[[.045,-.022],[.156,-.018],[.165,.018],[.045,.022]]);stem.rotation.z=a;for(const sign of [-1,1]){const tip=polar(.272,sign*.18),o=spoke(group,[[.139,-.012],[tip[0],tip[1]-.014],[tip[0],tip[1]+.014],[.139,.012]]);o.rotation.z=a;}}
 if(wheel.kind==='fifteen')for(let i=0;i<15;i++){const a=i*Math.PI*2/15,o=spoke(group,[[.045,-.01],[.27,.018],[.27,.035],[.045,.01]]);o.rotation.z=a;}
 const hub=mesh(group,new T.CylinderGeometry(hubRadius,hubRadius,.025,32),metal,0,0,-.01);hub.rotation.x=Math.PI/2;
 mesh(group,new T.TorusGeometry(.044,.003,5,24),edge,0,0,.004);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const bolt=mesh(group,new T.CylinderGeometry(.006,.006,.006,6),edge,Math.cos(a)*.032,Math.sin(a)*.032,.007);bolt.rotation.x=Math.PI/2;}
 group.userData.design=wheel.kind;
 }
 }
 model.userData.artOwned={geometry,materials};return model;
}
