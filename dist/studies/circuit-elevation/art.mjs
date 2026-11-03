import {pitLayout} from './layout.mjs';
import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {terrainHeight,START_X} from './terrain.mjs';
const base=new URL('./assets/',import.meta.url).href;
let pendingArt;
export function prepareCircuitArt(){return pendingArt??=loadArt();}
async function loadArt(){
 const loader=new T.TextureLoader();
 // Explicit load promises prevent entering a scene with missing art.
 async function maps(folder,scale){const urls=['Diffuse','nor_gl','Rough'];const values=await Promise.all(urls.map(n=>loader.loadAsync(base+folder+'/'+n+'.jpg')));values.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(scale,scale);t.anisotropy=4;if(i===0)t.colorSpace=T.SRGBColorSpace;});return{map:values[0],normalMap:values[1],roughnessMap:values[2]};}
 const [ground,wall,roadMaps,barrier,fence,tyre,opacity]=await Promise.all([
  maps('grass_ground',7/2.51),maps('concrete_wall_001',1),
  Promise.all(['color','normal','roughness'].map(n=>loader.loadAsync('./assets/materials/asphalt-'+n+'.jpg'))),
  new GLTFLoader().loadAsync(base+'concrete_road_barrier/barrier-study.gltf'),
  new GLTFLoader().loadAsync(base+'modular_chainlink_fence/modular_chainlink_fence.gltf'),
  new GLTFLoader().loadAsync(base+'old_tyre/old_tyre.gltf'),
  loader.loadAsync(base+'modular_chainlink_fence/textures/wire_opacity.png')
 ]);
 roadMaps.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(7/3,7/3);t.anisotropy=4;if(i===0)t.colorSpace=T.SRGBColorSpace;});
 const road={map:roadMaps[0],normalMap:roadMaps[1],roughnessMap:roadMaps[2],normalScale:new T.Vector2(.45,.45)};
 const concrete=new T.MeshStandardMaterial({...wall,color:'#d0ccc2',roughness:1,normalScale:new T.Vector2(.45,.45)});
 // Metric UVs on instanced box faces, so a 160 m facade does not stretch a 3 m scan.
 concrete.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
 vec4 assetP=vec4(position,1.0);vec3 assetN=normal;
 #ifdef USE_INSTANCING
 assetP=instanceMatrix*assetP;assetN=mat3(instanceMatrix)*assetN;
 #endif
 assetP=modelMatrix*assetP;assetN=normalize(mat3(modelMatrix)*assetN);
 vec2 assetUV=abs(assetN.y)>.5?assetP.xz:(abs(assetN.x)>.5?assetP.zy:assetP.xy);assetUV/=1.5;
 vMapUv=assetUV;vNormalMapUv=assetUV;vRoughnessMapUv=assetUV;`);};
 concrete.customProgramCacheKey=()=> 'circuit-world-wall-1';
 fence.scene.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=4;if(m.name==='modular_chainlink_fence_wire'){const a=opacity.clone();a.offset.copy(m.map.offset);a.repeat.copy(m.map.repeat);a.center.copy(m.map.center);a.rotation=m.map.rotation;a.wrapS=m.map.wrapS;a.wrapT=m.map.wrapT;a.needsUpdate=true;m.alphaMap=a;m.transparent=false;m.alphaTest=.5;m.side=T.DoubleSide;m.needsUpdate=true;}}});
 return{road,ground,concrete,barrier:barrier.scene,fence:fence.scene,tyre:tyre.scene};
}
function parts(source,rotationX=0){
 const node=source.clone(true);node.position.set(0,0,0);node.rotation.x+=rotationX;node.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(node),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),result=[];
 node.traverse(o=>{if(o.isMesh){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-box.min.y,-center.z);result.push({geometry:geo,material:o.material});}});
 return{parts:result,size};
}
export function installCircuitProps(scene,art,layout=pitLayout()){
 const counts={barriers:0,fencePanels:0,fencePosts:0,tyres:0},bounds=[];
 function instances(template,placements,name,scale=new T.Vector3(1,1,1)){
  for(const part of template.parts){const mesh=new T.InstancedMesh(part.geometry,part.material,placements.length);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;const obj=new T.Object3D();placements.forEach((p,i)=>{obj.position.set(p.x,terrainHeight(p.x,p.z)+(p.y||.045),p.z);obj.rotation.set(0,p.angle||0,0);obj.scale.copy(scale);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);});mesh.computeBoundingSphere();scene.add(mesh);}
 }
 // Replace the same 180 m separator footprint; visual parts do not alter driving rules.
 const barrier=parts(art.barrier),barriers=[];const length=180,count=120;
 for(let i=0;i<count;i++)barriers.push({x:layout.separatorX,z:250-START_X+(i+.5)*length/count,angle:Math.PI/2});
 instances(barrier,barriers,'Poly Haven concrete pit separator',new T.Vector3(1.5/barrier.size.x,.96/barrier.size.y,.6/barrier.size.z));counts.barriers=count;
 bounds.push({name:'separator',x:[layout.separatorX-.3,layout.separatorX+.3],z:[250-START_X,430-START_X],collider:'existing pit separator'});
 // The fence runs atop the divider, stopping 12 m before the exit sight line.
 const panel=parts(art.fence.getObjectByName('modular_chainlink_fence_double')),
 post=parts(art.fence.getObjectByName('modular_chainlink_fence_post')),panels=[],posts=[];
 for(let i=0;i<84;i++)panels.push({x:layout.separatorX,z:251-START_X+i*2,y:1,angle:Math.PI/2});
 for(let i=0;i<=84;i++)posts.push({x:layout.separatorX,z:250-START_X+i*2,y:1,angle:Math.PI/2});
 instances(panel,panels,'Poly Haven pit fence');instances(post,posts,'Poly Haven fence posts');counts.fencePanels=panels.length;counts.fencePosts=posts.length;
 // Spare tyre stacks sit on the apron beyond the lane, away from merge sight lines.
 const tyre=parts(art.tyre,Math.PI/2),tyres=[];
 for(const z of (layout.id==='compact'?[316,340,364]:[310,342,374]))for(let column=0;column<3;column++)for(let row=0;row<4;row++)tyres.push({x:layout.front-3+column*.65,z:z-START_X,y:.11+row*tyre.size.y,angle:(row+column)*.6});
 instances(tyre,tyres,'Poly Haven spare tyres');counts.tyres=tyres.length;
 return{...counts,source:'Poly Haven CC0',bounds,barrierTriangles:7573,download:'local 1K textures',fenceAlphaTest:.5};
}
