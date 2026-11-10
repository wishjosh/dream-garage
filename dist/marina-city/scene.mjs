import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {trackFrame,nearestTrack} from '../race-core.mjs';
import {BLOCKS,STREETS,WATER,inWater,streetDistance} from './plan.mjs';
const source=new URL('../studies/circuit-elevation/assets/',import.meta.url).href;
const assets=new URL('../assets/',import.meta.url).href;
export async function buildMarinaCity(scene,track,{renderer}){
 const skyCanvas=document.createElement('canvas');skyCanvas.width=8;skyCanvas.height=512;const skyCtx=skyCanvas.getContext('2d'),gradient=skyCtx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#4d657e');gradient.addColorStop(.65,'#93a7b5');gradient.addColorStop(1,'#ddc7aa');skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,8,512);scene.background=new T.CanvasTexture(skyCanvas);scene.background.colorSpace=T.SRGBColorSpace;scene.fog=new T.FogExp2('#a4afb2',.0005);scene.environmentIntensity=.8;
 const sky=new T.HemisphereLight('#c6d9ed','#74705f',2.1);scene.add(sky);
 const sun=new T.DirectionalLight('#ffe0b9',2.3);sun.position.set(-160,240,-90);scene.add(sun);
 const texLoader=new T.TextureLoader(),gltf=new GLTFLoader();
 async function texture(url,color=false,repeat=1){const t=await texLoader.loadAsync(url);if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
 const [asphalt,roadNormal,rough,wall,wallNormal,grass,wire,opacity,facade,palm,leafTexture,leafAlpha]=await Promise.all([
  texture(assets+'materials/asphalt-color.jpg',true),texture(assets+'materials/asphalt-normal.jpg'),texture(assets+'materials/asphalt-roughness.jpg'),
  texture(source+'concrete_wall_001/Diffuse.jpg',true),texture(source+'concrete_wall_001/nor_gl.jpg'),texture(source+'grass_ground/Diffuse.jpg',true),
  texture(source+'modular_chainlink_fence/textures/modular_chainlink_fence_wire_diff_1k.jpg',true),texture(source+'modular_chainlink_fence/textures/wire_opacity.png'),
  gltf.loadAsync(assets+'marina-city/facade/facade.gltf'),gltf.loadAsync(assets+'tree_palmDetailedTall.glb'),texture(assets+'marina-city/foliage/leaves.jpg',true),texture(assets+'marina-city/foliage/alpha.png')
 ]);
 const std=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
 const mats={road:std('#b4b4b3',{map:asphalt,normalMap:roadNormal,normalScale:new T.Vector2(.12,.12),roughnessMap:rough}),concrete:std('#b8b6ab',{map:wall,normalMap:wallNormal,normalScale:new T.Vector2(.15,.15)}),pavement:std('#a4a198'),stone:std('#b9b5aa'),metal:std('#485659',{metalness:.55,roughness:.46}),white:std('#e4e2d6'),red:std('#9e3027'),grass:std('#70846b',{map:grass}),glass:std('#5c737d',{metalness:.65,roughness:.28}),dark:std('#343d40'),warm:std('#f1debd',{emissive:'#ffd49b',emissiveIntensity:.8}),pool:std('#223b45',{metalness:.65,roughness:.2})};
 const unit=new T.BoxGeometry(1,1,1),batches=new Map();
 function box(w,h,d,x,y,z,mat=mats.concrete,angle=0){if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push({x,y,z,w,h,d,angle});}
 function flush(){for(const [mat,items]of batches){const mesh=new T.InstancedMesh(unit,mat,items.length),o=new T.Object3D();items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.w,p.h,p.d);o.rotation.set(0,p.angle,0);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.computeBoundingSphere();mesh.name='Marina architecture and streets';scene.add(mesh);}batches.clear();}
 function polygon(points,y,mat){const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1]))),g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/5,pos.getZ(i)/5);const m=new T.Mesh(g,mat);m.position.y=y;scene.add(m);return m;}
 box(2200,.3,2100,50,-.5,100,std('#747b6c'));
 const water=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 world; void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',fragmentShader:'uniform float time;varying vec3 world;void main(){float r=sin(world.x*.51+sin(world.z*.32)+time*.5)*sin(world.z*.88-time*.2);float bands=pow(max(0.,sin(world.z*.135+world.x*.018+time*.1)),12.);vec3 c=mix(vec3(.13,.25,.29),vec3(.27,.38,.42),.5+r*.18)+bands*.025;gl_FragColor=vec4(c,1.);}',side:T.DoubleSide});
 WATER.forEach(p=>polygon(p,-.1,water));
 for(const street of STREETS){const a=street.a,b=street.b,l=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=Math.atan2(b[0]-a[0],b[1]-a[1]);box(street.width+7,.18,l,(a[0]+b[0])/2,-.06,(a[1]+b[1])/2,mats.pavement,angle);const nx=(b[1]-a[1])/l*street.width/2,nz=-(b[0]-a[0])/l*street.width/2;polygon([[a[0]-nx,a[1]-nz],[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz]],.044,mats.road);}
 function ribbon(width,y,mat){const v=[],uv=[],idx=[],n=track.frames.length;for(let i=0;i<=n;i++){const f=track.frames[i%n];for(const side of [-1,1]){v.push(f.x+f.rx*width*side,y,f.z+f.rz*width*side);uv.push((side+1)*width/3,i/n*track.length/3);}if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,mat);scene.add(m);}
 ribbon(11.5,.046,mats.pavement);ribbon(8.2,.055,mats.road);
 const fences=[],count=Math.floor(track.length/5),ds=track.length/count;
 for(let i=0;i<count;i++){const f=trackFrame(track,i*ds),a=Math.atan2(f.tx,f.tz);for(const side of [-1,1]){const x=f.x+f.rx*side*8.8,z=f.z+f.rz*side*8.8,prev=trackFrame(track,i*ds-ds/2),next=trackFrame(track,i*ds+ds/2),span=Math.hypot(next.x+next.rx*side*8.8-prev.x-prev.rx*side*8.8,next.z+next.rz*side*8.8-prev.z-prev.rz*side*8.8)+.05;box(.44,1.05,span,x,.64,z,mats.concrete,a);if(i%3===0)box(.46,.17,span,x,.98,z,mats.red,a);fences.push({x,z,a,span});box(.065,2.5,.065,x,2.25,z,mats.metal,a);box(.055,.055,ds,x,3.45,z,mats.metal,a);if(i%2===0)box(.13,.012,4.5,f.x+f.rx*side*7.55,.067,f.z+f.rz*side*7.55,mats.white,a);}if(i%3===0)box(.12,.012,3,f.x,.068,f.z,mats.white,a);}
 const fg=new T.PlaneGeometry(ds-.05,2.25),fm=new T.MeshStandardMaterial({map:wire,alphaMap:opacity,alphaTest:.45,side:T.DoubleSide,roughness:.7,color:'#a5acaa'}),fi=new T.InstancedMesh(fg,fm,fences.length),fo=new T.Object3D();fences.forEach((p,i)=>{fo.position.set(p.x,2.3,p.z);fo.rotation.set(0,p.a+Math.PI/2,0);fo.scale.set(p.span/ds,1,1);fo.updateMatrix();fi.setMatrixAt(i,fo.matrix);});fi.computeBoundingSphere();scene.add(fi);
 // Streets remain visible beyond the barriers at ordinary city intersections.
 for(const street of STREETS){const dx=street.b[0]-street.a[0],dz=street.b[1]-street.a[1],len=Math.hypot(dx,dz),tx=dx/len,tz=dz/len;for(let s=20;s<len;s+=40){const x=street.a[0]+tx*s,z=street.a[1]+tz*s;if(nearestTrack(track,x,z).distance<13||inWater(x,z))continue;box(.15,.012,8,x,.052,z,mats.white,Math.atan2(tx,tz));}}
 // Low, planted blocks form a civic district rather than a ring of buildings.
 for(const b of BLOCKS){box(b.w+7,.2,b.d+7,b.x,-.01,b.z,mats.pavement);if(b.kind==='park'){box(b.w,.08,b.d,b.x,.12,b.z,mats.grass);box(5,.1,b.d,b.x,.19,b.z,mats.stone);box(b.w,.1,4,b.x,.2,b.z,mats.stone);}}
 function windowMap(){const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#697b83';ctx.fillRect(0,0,256,512);for(let y=0;y<32;y++)for(let x=0;x<12;x++){const n=(x*13+y*19)%17;ctx.fillStyle=n<2?'#b8ab8e':n<8?'#566c78':'#71858e';ctx.fillRect(x*21+2,y*16+2,18,12);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
 const windows=windowMap(),towerMat=std('#c5cbd0',{map:windows,emissiveMap:windows,emissive:'#a18c70',emissiveIntensity:.16,metalness:.5,roughness:.37});
 const facadePlacements=[];
 for(const [bi,b] of BLOCKS.entries()){
  if(b.kind==='park')continue;
  if(b.kind==='office'){
   const cols=b.w>180?3:2;for(let k=0;k<cols;k++){const x=b.x+(k-(cols-1)/2)*(b.w/cols),w=b.w/cols*.62,d=b.d*.52,h=b.h*(.72+.19*((bi+k)%3));box(w+10,7,d+14,x,3.6,b.z,mats.concrete);box(w,h,d,x,h/2+7,b.z,towerMat);box(w*.85,3,d*.85,x,h+8,b.z,mats.metal);for(let y=17;y<h;y+=20)box(w+.3,.3,d+.3,x,y,b.z,mats.metal);for(const side of [-1,1])box(.5,h,.6,x+side*w/2,h/2+7,b.z+d/2+.05,mats.stone);}
  }else if(b.kind==='civic'){
   box(82,11,54,b.x,5.6,b.z,mats.concrete);box(94,1.2,64,b.x,11.7,b.z,mats.stone);for(let k=-4;k<=4;k++)box(1.1,8,1.1,b.x+k*9,4.6,b.z-32,mats.stone);box(88,.4,13,b.x,.3,b.z-32,mats.stone);box(58,8,1,b.x,4.8,b.z-27.2,mats.glass);
  }else{
   const w=b.w*.34,d=b.d*.52;for(const side of [-1,1]){const x=b.x+side*b.w*.24,h=b.h*(side===1?1:.83);box(w,h,d,x,h/2+.2,b.z,mats.concrete);box(w+1,.45,d+1,x,h+.4,b.z,mats.stone);for(let y=3.2;y<h;y+=3.4){box(w+.4,.16,d+.4,x,y,b.z,mats.stone);for(const front of [-1,1]){if(['old-north','old-square'].includes(b.id)&&front===-1&&y<10){for(let k=0;k<8;k++)facadePlacements.push({x:x-12+k*3+1.5,y:y-3,z:b.z+front*(d/2+.06),angle:Math.PI});}else{box(w*.88,2.2,.06,x,y-1.1,b.z+front*(d/2+.06),mats.glass);for(let k=-3;k<=3;k++)box(.3,2.5,.15,x+k*w/8,y-1.1,b.z+front*(d/2+.1),mats.stone);}}}box(w*.9,.35,3.5,x,3,b.z-d/2-1.7,mats.metal);}
  }
 }
 // Original detailed facade modules: wall, inset windows and cornice kept together.
 const template=new T.Group();for(const name of ['wall_window_centered_double_01','window_centered_double_01','cornice_standard_standard_01']){const obj=facade.scene.getObjectByName(name).clone(true);obj.position.set(1.5,0,0);template.add(obj);}template.updateMatrixWorld(true);
 template.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.clone().applyMatrix4(m.matrixWorld),inst=new T.InstancedMesh(geo,m.material,facadePlacements.length),o=new T.Object3D();facadePlacements.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.y=p.angle;o.updateMatrix();inst.setMatrixAt(i,o.matrix);});inst.computeBoundingSphere();inst.name='Poly Haven original facade modules';scene.add(inst);});
 // A distant cluster makes the skyline legible across the bay.
 for(let i=0;i<15;i++){const x=-500+(i%5)*72,z=510+Math.floor(i/5)*90,h=65+(i*31)%96;box(29+i%3*9,h,35,x,h/2,z,towerMat);box(29+i%3*9,1,35,x,h+.5,z,mats.stone);}
 for(let i=0;i<12;i++){const x=-500+i*83,z=-520-(i%3)*50,h=52+(i*37)%93;box(38,h,42,x,h/2,z,towerMat);box(40,2,44,x,h+1,z,mats.stone);}
 // Three terraced towers and an elevated garden are a fictional waterfront landmark.
 for(const x of [20,92,164]){box(32,145,43,x,72.5,610,towerMat);for(let y=12;y<145;y+=12)box(33,.6,44,x,y,610,mats.stone);}box(207,5,52,92,149,610,mats.stone);box(198,.6,44,92,152,610,mats.grass);
 // Bridge rails and repeated steel frames expose the water channel below.
 box(22,1,90,300,-.5,220,mats.concrete);for(const side of [-1,1]){box(.28,1.2,87,300+side*12.5,.7,220,mats.stone);for(let z=178;z<263;z+=7){box(.25,5,.25,300+side*12.8,2.5,z,mats.metal);box(.18,.18,8.7,300+side*12.8,2.6,z+3.5,mats.metal);}}
 // Bay edge, broad promenade and correctly scaled seats.
 for(let x=-65;x<235;x+=5){box(5,.8,1.1,x,-.1,274,mats.concrete);box(.07,1.1,.07,x,.85,276,mats.metal);}box(303,.07,.07,85,1.38,276,mats.metal);box(306,.13,11,85,.01,281,mats.pavement);
 for(let x=-50;x<220;x+=35){box(2,.15,.58,x,.53,280,mats.metal);box(.08,.5,.5,x-.75,.25,280,mats.metal);box(.08,.5,.5,x+.75,.25,280,mats.metal);}
 // Pit building: 4 m doors, 6 m floor height, behind the start boulevard.
 box(126,6,17,-110,3.1,-319,mats.concrete);box(132,.5,21,-110,6.4,-318,mats.stone);box(115,2.2,12,-110,7.5,-320,mats.glass);
 for(let i=0;i<18;i++){box(4,3.8,.12,-168+i*6.8,2.05,-310.4,mats.metal);box(4,.12,.2,-168+i*6.8,4.05,-310.3,mats.warm);}box(132,.05,10,-110,.04,-302,mats.pavement);
 // Tropical trees are reused CC0 Kenney models, normalized by their actual bounds.
 const trees=[];for(const b of BLOCKS.filter(b=>b.kind==='park'))for(let x=b.x-b.w/2+10;x<b.x+b.w/2;x+=24)for(const side of [-1,1])trees.push({x,z:b.z+side*(b.d/2-10),h:7.5+(Math.abs(x)%4)});
 for(let x=-300;x<210;x+=30)trees.push({x,z:-263,h:8.5});for(let x=-60;x<220;x+=28)trees.push({x,z:283,h:8});
 const palmTrees=Array.from({length:8},(_,i)=>({x:350+(i%2)*48,z:60+Math.floor(i/2)*28,h:9+(i%3)}));
 const palmRoot=palm.scene;palmRoot.updateMatrixWorld(true);const pb=new T.Box3().setFromObject(palmRoot),height=pb.max.y-pb.min.y,center=pb.getCenter(new T.Vector3());palmRoot.traverse(m=>{if(!m.isMesh)return;const g=m.geometry.clone().applyMatrix4(m.matrixWorld);g.translate(-center.x,-pb.min.y,-center.z);const mat=m.material.clone();mat.roughness=.95;mat.color.set('#a4a17c');const inst=new T.InstancedMesh(g,mat,palmTrees.length),o=new T.Object3D();palmTrees.forEach((p,i)=>{o.position.set(p.x,.18,p.z);o.rotation.y=i*.9;o.scale.setScalar(p.h/height);o.updateMatrix();inst.setMatrixAt(i,o.matrix);});inst.computeBoundingSphere();scene.add(inst);});

 // Near trees use real CC0 foliage on lightweight canopy cards, not the 2M-triangle source tree.
 const leafMat=new T.MeshStandardMaterial({map:leafTexture,alphaMap:leafAlpha,alphaTest:.55,side:T.DoubleSide,roughness:1,color:'#a5b394'}),leafGeo=new T.PlaneGeometry(.95,1.25),leafUv=leafGeo.attributes.uv;
 for(let i=0;i<leafUv.count;i++)leafUv.setXY(i,.42+leafUv.getX(i)*.38,.46+leafUv.getY(i)*.44);
 const leafCount=100,leafInstances=new T.InstancedMesh(leafGeo,leafMat,trees.length*leafCount),trunkGeo=new T.CylinderGeometry(.12,.23,1,7),trunkMat=std('#645b48',{map:wall}),trunks=new T.InstancedMesh(trunkGeo,trunkMat,trees.length),branches=new T.InstancedMesh(new T.CylinderGeometry(.04,.11,1,5),trunkMat,trees.length*5),treeObject=new T.Object3D();
 const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 trees.forEach((p,i)=>{const trunkHeight=p.h*.66;treeObject.position.set(p.x,trunkHeight/2+.18,p.z);treeObject.rotation.set(0,0,0);treeObject.scale.set(1,trunkHeight,1);treeObject.updateMatrix();trunks.setMatrixAt(i,treeObject.matrix);
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5+i;treeObject.position.set(p.x+Math.cos(a)*.7,trunkHeight-.3,p.z+Math.sin(a)*.7);treeObject.rotation.set(Math.sin(a)*.8,0,-Math.cos(a)*.8);treeObject.scale.set(1,2.3,1);treeObject.updateMatrix();branches.setMatrixAt(i*5+k,treeObject.matrix);}
  for(let k=0;k<leafCount;k++){const n=i*leafCount+k,angle=random(n+1)*Math.PI*2,rad=Math.sqrt(random(n+2))*2.1,dy=(random(n+3)-.5)*2.1;treeObject.position.set(p.x+Math.cos(angle)*rad,trunkHeight+.3+dy,p.z+Math.sin(angle)*rad);treeObject.rotation.set((random(n+5)-.5)*2,random(n+6)*Math.PI*2,(random(n+7)-.5));treeObject.scale.setScalar(.85+random(n+8)*.5);treeObject.updateMatrix();leafInstances.setMatrixAt(n,treeObject.matrix);}});
 for(const inst of [trunks,branches,leafInstances]){inst.computeBoundingSphere();scene.add(inst);}
 // Floodlight structures use one emissive material; no hundreds of real-time lights.
 for(let s=0;s<track.length;s+=32){const f=trackFrame(track,s),a=Math.atan2(f.tx,f.tz);for(const side of [-1,1]){const x=f.x+f.rx*side*11.8,z=f.z+f.rz*side*11.8;box(.14,10,.14,x,5,z,mats.metal);box(3.1,.13,.16,x-f.rx*side*1.4,10,z-f.rz*side*1.4,mats.metal,a);box(1.2,.12,.8,x-f.rx*side*2.7,9.9,z-f.rz*side*2.7,mats.warm,a);}}
 function sign(text,w,h){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#213735';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#deded0';ctx.lineWidth=5;ctx.strokeRect(8,8,752,176);ctx.fillStyle='#faf8e9';ctx.font='600 70px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,98,715);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,side:T.DoubleSide}));}
 const start=trackFrame(track,4),yaw=Math.atan2(start.tx,start.tz);const gantry=sign('MARINA CITY',17.3,2.5);gantry.position.set(start.x,7.3,start.z);gantry.rotation.y=yaw+Math.PI;scene.add(gantry);for(const side of [-1,1])box(.35,8,.35,start.x+start.rx*side*9.4,4,start.z+start.rz*side*9.4,mats.metal);
 for(let row=0;row<2;row++)for(let col=0;col<16;col++){const f=trackFrame(track,row*.75);box(.95,.016,.7,f.x+f.rx*(col-7.5),.076,f.z+f.rz*(col-7.5),(row+col)%2?mats.white:mats.dark,Math.atan2(f.tx,f.tz));}
 for(const turn of track.turns){for(const distance of [100,50]){const f=trackFrame(track,turn.s-distance),p=sign(String(distance),1.6,1);p.position.set(f.x-f.rx*10.2,2,f.z-f.rz*10.2);p.rotation.y=Math.atan2(f.tx,f.tz)+Math.PI;scene.add(p);}const f=trackFrame(track,turn.s-8),p=sign(turn.direction>0?'› ›':'‹ ‹',2.4,1);p.position.set(f.x-f.rx*10.5,2.3,f.z-f.rz*10.5);p.rotation.y=Math.atan2(f.tx,f.tz)+Math.PI;scene.add(p);}
 // A light observation wheel is readable from the channel, without branded geometry.
 const wheel=new T.Group();wheel.position.set(365,36,105);wheel.rotation.y=.6;scene.add(wheel);const rim=new T.Mesh(new T.TorusGeometry(30,.18,5,64),mats.white);wheel.add(rim);const vv=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;vv.push(0,0,0,Math.cos(a)*30,Math.sin(a)*30,0);const c=new T.Mesh(new T.BoxGeometry(2.1,1.7,2),mats.glass);c.position.set(Math.cos(a)*30,Math.sin(a)*30,0);wheel.add(c);}const spokes=new T.BufferGeometry();spokes.setAttribute('position',new T.Float32BufferAttribute(vv,3));wheel.add(new T.LineSegments(spokes,new T.LineBasicMaterial({color:'#bfc4c3'})));box(.65,35,.65,357,17.5,105,mats.white);box(.65,35,.65,373,17.5,105,mats.white);
 flush();
 return{groundHeight:()=>0,update(){},tick:dt=>{water.uniforms.time.value+=dt;},stats:()=>({kind:'marina-city',blocks:BLOCKS.length,streets:STREETS.length,waterBodies:WATER.length,sourceFacadeModules:facadePlacements.length,trees:trees.length,bridge:'flat playable deck over visual channel'})};
}
