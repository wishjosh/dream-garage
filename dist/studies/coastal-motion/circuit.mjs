import * as T from '../../vendor/three.module.js';
import {trackFrame,nearestTrack,angleDelta} from '../../race-core.mjs';
import {coastalTerrain} from './landscape.mjs';
import {addCoastalSky,sunDirection} from './sky.mjs';

const materialRoot=new URL('../../studies/circuit-elevation/assets/',import.meta.url);
const assets=new URL('../../assets/',import.meta.url);
const here=new URL('./',import.meta.url);
const textureLoader=new T.TextureLoader();
const white=new T.Color(1,1,1);
function url(base,file){return new URL(file,base).href;}
async function texture(base,file,{color=true,repeat=false}={}){
  const tex=await textureLoader.loadAsync(url(base,file));
  if(color)tex.colorSpace=T.SRGBColorSpace;
  if(repeat)tex.wrapS=tex.wrapT=T.RepeatWrapping;
  return tex;
}
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.82,...extra});
function surface(scene,track,offsets,surfaceHeight,material,tile,shade=()=>1){
  const pos=[],uv=[],colors=[],idx=[];const n=track.frames.length;
  for(let i=0;i<=n;i++){
    const f=track.frames[i%n],s=i*track.length/n;
    for(let j=0;j<offsets.length;j++){
      const offset=offsets[j],x=f.x+f.rx*offset,z=f.z+f.rz*offset;
      pos.push(x,surfaceHeight(s,offset,x,z),z);uv.push(offset/tile,s/tile);
      const light=shade(s,offset);colors.push(light,light,light);
      if(i<n&&j<offsets.length-1){
        const a=i*offsets.length+j,b=a+offsets.length;
        idx.push(a,b,a+1,a+1,b,b+1);
      }
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;scene.add(mesh);
}
function batchBuilder(scene){
  const batches=new Map(),cube=new T.BoxGeometry(1,1,1),obj=new T.Object3D(),tint=new T.Color();
  function add(material,geometry,x,y,z,w,h,d,yaw=0,color=null,lean=0){
    if(!batches.has(material))batches.set(material,new Map());
    const byGeometry=batches.get(material);
    if(!byGeometry.has(geometry))byGeometry.set(geometry,[]);
    obj.position.set(x,y,z);obj.rotation.set(0,yaw,lean,'YXZ');obj.scale.set(w,h,d);obj.updateMatrix();
    byGeometry.get(geometry).push([obj.matrix.clone(),color]);
  }
  function box(material,x,y,z,w,h,d,yaw=0,color=null){add(material,cube,x,y,z,w,h,d,yaw,color);}
  function flush(){
    for(const [material,groups] of batches)for(const [geometry,poses] of groups){
      const mesh=new T.InstancedMesh(geometry,material,poses.length);
      const colored=poses.some(([,color])=>color!==null);
      poses.forEach(([matrix,color],i)=>{mesh.setMatrixAt(i,matrix);if(colored)mesh.setColorAt(i,color?tint.set(color):white);});
      mesh.computeBoundingSphere();scene.add(mesh);
    }
  }
  return {add,box,flush};
}
function makeSign(canvasText,background,ink,ratio=2){
  const c=document.createElement('canvas');c.width=512;c.height=Math.round(512/ratio);
  const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle=ink;ctx.font='bold '+Math.round(c.height*(ratio>5?.46:.77))+'px Arial, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(canvasText,c.width/2,c.height*.54,c.width*.91);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map:tex,roughness:.77,side:T.DoubleSide});
}
function curve(track,s){
  const a=trackFrame(track,s-5),b=trackFrame(track,s+5);
  return angleDelta(Math.atan2(b.tx,b.tz),Math.atan2(a.tx,a.tz))/10;
}
function signFace(scene,track,s,offset,h,w,d,material){
  const f=trackFrame(track,s),o=new T.Mesh(new T.PlaneGeometry(w,d),material);
  o.position.set(f.x+offset*f.rx,h,f.z+offset*f.rz);o.rotation.y=Math.atan2(-f.tx,-f.tz);scene.add(o);
}
function vegetation(scene,track,image,heightAt){
  let seed=189;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trees=[];
  for(let s=17;s<track.length;s+=16+rnd()*19){
    const f=trackFrame(track,s),side=rnd()>.49?1:-1,offset=side*(24+rnd()*33);
    const x=f.x+f.rx*offset,z=f.z+f.rz*offset;
    if((s<85&&side>0)||nearestTrack(track,x,z).distance<22)continue;
    const height=5.6+rnd()*3.3;
    trees.push({x,z,y:Math.max(-.08,heightAt(x,z))+.01,height,width:height*(1.04+rnd()*.29),tone:.86+rnd()*.18});
  }
  const geom=new T.PlaneGeometry(1,1),flips=trees.map((_,i)=>i%4===1?1:0);
  geom.setAttribute('flipTree',new T.InstancedBufferAttribute(new Float32Array(flips),1));
  const material=new T.ShaderMaterial({
    side:T.DoubleSide,uniforms:{canopy:{value:image}},
    vertexShader:[
      'attribute float flipTree;varying vec2 vUv;varying float depth;varying vec3 tone;',
      'void main(){vUv=vec2(mix(uv.x,1.-uv.x,flipTree),uv.y);tone=instanceColor;',
      'vec3 right=normalize(vec3(viewMatrix[0][0],0.,viewMatrix[2][0]));',
      'vec3 p=instanceMatrix[3].xyz+right*position.x*length(instanceMatrix[0].xyz)+vec3(0.,position.y*length(instanceMatrix[1].xyz),0.);',
      'vec4 eye=viewMatrix*vec4(p,1.);depth=-eye.z;gl_Position=projectionMatrix*eye;}'
    ].join('\n'),
    fragmentShader:[
      'uniform sampler2D canopy; varying vec2 vUv;varying float depth;varying vec3 tone;',
      'void main(){vec4 pixel=texture2D(canopy,vUv);if(pixel.a<.48)discard;',
      'gl_FragColor=vec4(mix(pixel.rgb*tone,vec3(.57,.61,.57),.55*smoothstep(70.,380.,depth)),1.);',
      '#include <colorspace_fragment>','}'
    ].join('\n'),
  });
  const obj=new T.Object3D(),tint=new T.Color();
  const canopy=new T.InstancedMesh(geom,material,trees.length);
  trees.forEach((tree,i)=>{
    obj.position.set(tree.x,tree.y+tree.height*.5,tree.z);obj.scale.set(tree.width,tree.height,1);obj.updateMatrix();
    canopy.setMatrixAt(i,obj.matrix);canopy.setColorAt(i,tint.setRGB(tree.tone,tree.tone,tree.tone));
  });
  canopy.computeBoundingSphere();canopy.name='Coastal stone pines';scene.add(canopy);
}

export async function buildCircuit(scene,track,renderer){
  const horizonFile=renderer.capabilities.maxTextureSize>=8192?'coast-horizon-8k.webp':'coast-horizon-4k.webp';
  const [coast,asphalt,normal,rough,grassMap,concreteMap,pine,horizon]=await Promise.all([
    texture(here,'coast.webp'),texture(assets,'materials/asphalt-color.jpg',{repeat:true}),
    texture(assets,'materials/asphalt-normal.jpg',{color:false,repeat:true}),texture(assets,'materials/asphalt-roughness.jpg',{color:false,repeat:true}),
    texture(materialRoot,'grass_ground/Diffuse.jpg',{repeat:true}),texture(materialRoot,'concrete_wall_001/Diffuse.jpg',{repeat:true}),
    texture(here,'stone-pine.webp'),texture(here,horizonFile),
  ]);
  for(const tx of [asphalt,normal,rough,grassMap,concreteMap])tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  scene.background=new T.Color('#c6cfd1');scene.fog=new T.Fog('#c7c6b9',165,640);scene.environmentIntensity=.83;
  addCoastalSky(scene,coast,horizon);
  scene.add(new T.HemisphereLight('#f7ecd4','#6a6252',1.56));
  const sun=new T.DirectionalLight('#ffdeb0',2.75);sun.position.copy(sunDirection).multiplyScalar(70);scene.add(sun);
  const pavement=mat('#afa99f',{map:asphalt,normalMap:normal,normalScale:new T.Vector2(.21,.21),roughness:.97,roughnessMap:rough,vertexColors:true});
  const grass=mat('#d1cfad',{map:grassMap,vertexColors:true});
  const gravel=mat('#c6b89a',{map:concreteMap,vertexColors:true}),concrete=mat('#c6beb1',{map:concreteMap});
  const enamel=mat('#fcf6dd'),steel=mat('#a0a5a2',{metalness:.61,roughness:.42}),dark=mat('#343e3e',{metalness:.48,roughness:.5});
  const oxide=mat('#ac5032',{metalness:.33,roughness:.45}),glass=mat('#5b7478',{metalness:.51,roughness:.26});
  const zero=()=>.044;
  surface(scene,track,[-8.18,-7.65,-6,-4,-2,0,2,4,6,7.65,8.18],zero,pavement,5.5,(s,l)=>{
    const path=Math.sin(2*Math.PI*s/track.length*3)*2.4;
    return .97-.15*Math.exp(-Math.pow((l-path)/2.5,2))+.026*Math.sin(s*.055+l);
  });
  const berm=(s,o,x,z)=>{
    const edge=Math.abs(o);
    if(edge<11)return -.035;
    const h=(Math.sin(s/61+Math.sign(o))*.5+.5)*2.0+.18;
    return Math.min(h,(edge-11)*.112,Math.max(0,nearestTrack(track,x,z).distance-12)*.10)-.06;
  };
  for(const side of [-1,1]){
    const offsets=[8.13,9.55,11.3].map(n=>n*side).sort((a,b)=>a-b);
    surface(scene,track,offsets,()=>.016,gravel,3.5);
    surface(scene,track,[10.9,15,24,39].map(n=>n*side).sort((a,b)=>a-b),berm,grass,6,(s,l)=>.87+.10*Math.cos(s/19+l*.3));
  }
  const heightAt=coastalTerrain(scene,track,grassMap,concreteMap);
  const batch=batchBuilder(scene);
  const at=(s,off,h,w,height,d,material,color=null)=>{
    const f=trackFrame(track,s);batch.box(material,f.x+f.rx*off,h,f.z+f.rz*off,w,height,d,Math.atan2(f.tx,f.tz),color);
  };
  const steps=Math.ceil(track.length/3.65),step=track.length/steps;
  for(let i=0;i<steps;i++){
    const s=(i+.5)*step,k=curve(track,s);
    for(const sign of [-1,1]){
      at(s,sign*7.70,.051,.105,.011,step+.018,enamel);
      if(k*sign>.0058)at(s,sign*7.98,.075,.40,.057,step-.025,enamel,i%2?'#b04a37':'#f1e7ce');
      const pit=s<74&&sign===1;
      if(pit){at(s,sign*8.85,.53,.43,1.04,step+.025,concrete);at(s,sign*8.85,1.066,.47,.050,step+.04,oxide);}
      else{
        at(s,sign*8.83,.56,.16,.28,step+.035,steel);
        at(s,sign*8.82,.711,.21,.052,step+.035,steel);
        at(s,sign*8.735,.568,.035,.042,step+.03,dark);
        at(s,sign*8.98,.45,.105,.90,.13,dark);
      }
    }
  }
  for(let bay=0;bay<5;bay++){
    const s=10+bay*9;
    at(s,17.2,.06,13.1,.1,9,concrete);
    at(s,19,2.03,7.5,4.06,8.96,concrete);
    at(s,15.23,1.65,.07,3.0,7.06,dark);
    for(let j=0;j<7;j++)at(s,15.17,.35+j*.42,.05,.046,7.03,steel);
    at(s,16.7,4.25,7.8,.24,9.03,oxide);
    at(s,19.1,4.56,6.9,.52,8.85,glass);
    at(s-4.32,13.15,2.08,.145,4.16,.15,dark);
  }
  for(const off of [-9.8,9.8])at(17,off,2.91,.24,5.82,.35,dark);
  at(17,0,5.8,20,.54,.47,dark);at(17,0,6.09,20,.07,.49,oxide);
  signFace(scene,track,16.74,0,5.80,7.65,.44,makeSign('COASTAL MOTOR CLUB','#303c3b','#f2ead7',16));
  for(let i=0;i<5;i++)at(16.78,(i-2)*.32,5.32,.23,.28,.22,dark);
  for(let col=0;col<32;col++)for(let row=0;row<2;row++){
    if((col+row)%2===0)at(16.5+row*.48,col*.48-7.44,.054,.478,.012,.474,enamel);
  }
  for(const s of [0,6.8,13.6])for(const sign of [-1,1]){
    at(s,2.32*sign,.054,1.89,.011,.105,enamel);
    at(s+.35,3.22*sign,.054,.085,.011,.72,enamel);
  }
  // Distances refer to the measured point of maximum curvature in each corner cluster.
  const corners=[];
  let block=null;
  for(let s=0;s<=track.length;s+=3){
    const k=Math.abs(curve(track,s));
    if(k>.010){if(!block)block={start:s,end:s};else block.end=s;}
    else if(block){if(block.end-block.start>9)corners.push((block.start+block.end)/2);block=null;}
  }
  const boardMats=new Map([[100,makeSign('100','#e9e3ce','#262c2b')],[50,makeSign('50','#e9e3ce','#262c2b')]]);
  // The standing start has 85 m to turn-in. These boards measure to turn-in,
  // independent of the apex markers used on the longer approaches.
  const turnIn=85,apex=125,exit=192;
  const signSide=-Math.sign(curve(track,apex));
  const raceInk=mat('#ffffff',{roughness:.72});
  const amber=new T.MeshBasicMaterial({color:'#e9aa42',toneMapped:false});
  const seafoam=new T.MeshBasicMaterial({color:'#9fd6b0',toneMapped:false});
  // Each pair is painted into the road plane. Rivals can cover the racing line
  // without obscuring both halves. The short bands stay fixed as the car accelerates.
  const roadMark=(s,offset,sign,colour,turn=0)=>{
    const f=trackFrame(track,s),yaw=Math.atan2(f.tx,f.tz);
    batch.box(colour,f.x+offset*f.rx,.085,f.z+offset*f.rz,2.06,.025,.68,yaw+sign*turn);
  };
  for(const distance of [75,50,25]){
    const s=turnIn-distance,offset=signSide*9.48;
    const ink=distance===25?'#f5ad43':'#f4f4de';
    const face=makeSign(String(distance),'#192827',ink,1.72);
    face.emissiveMap=face.map;face.emissive.set('#ffffff');face.emissiveIntensity=.24;
    at(s,offset,1.05,.13,2.1,.15,dark);
    at(s,offset,2.28,2.24,1.36,.18,dark);
    signFace(scene,track,s-.16,offset,2.28,2.17,1.26,face);
    at(s,offset,1.68,2.24,.105,.22,raceInk,distance===25?'#f7a137':'#f8f6e7');
  }
  // Nearby fixed features pass the car in parallax. Amber marks the braking strip;
  // the alternating inside kerb and the paired exit posts then take over.
  for(let s=0;s<exit+12;s+=8){
    for(const side of [-1,1]){
      const off=side*9.22;
      at(s,off,.83,.13,1.66,.16,raceInk,'#eef1df');
      at(s,off,1.39,.145,.30,.18,raceInk,s>=49&&s<=74?'#e48c29':'#394b4c');
    }
  }
  for(const s of [46,54,61,67]){
    for(const side of [-1,1]){
      roadMark(s,side*5.93,side,amber,.36);
      at(s,side*8.72,.76,.24,.32,2.48,amber);
    }
  }
  for(let s=turnIn;s<=178;s+=2.6){
    at(s,-signSide*7.72,.086,.95,.048,2.55,raceInk,Math.round((s-turnIn)/2.6)%2?'#e8e1c9':'#aa412f');
  }
  for(const s of [165,175,185,195]){
    roadMark(s,signSide*6.37,signSide,seafoam,-.32);
    at(s,signSide*8.79,.74,.22,.20,2.58,seafoam);
  }
  for(const s of [187,194]){at(s,signSide*9.35,1.22,.24,2.44,.24,dark);at(s,signSide*9.35,2.03,.255,.60,.26,raceInk,'#b2e2bc');}
  for(const apex of corners.slice(1)){
    const side=Math.sign(curve(track,apex))||-1;
    for(const d of [100,50]){
      const s=apex-d;
      if(s>0&&s<exit+6)continue;
      at(s,-side*9.65,.78,.10,1.56,.13,steel);
      at(s,-side*9.65,1.76,1.40,.77,.12,concrete);
      signFace(scene,track,s-.075,-side*9.65,1.76,1.37,.74,boardMats.get(d));
    }
    at(apex,side*9.13,1.13,.14,.75,.15,enamel);
    at(apex,side*9.13,1.34,.15,.18,.16,oxide);
  }
  vegetation(scene,track,pine,heightAt);batch.flush();
  return {groundHeight:()=>0,update(){},tick(){},stats:()=>({kind:'coastal-brake-loop',corners:corners.length,length:track.length,horizonWidth:horizon.image.width})};
}
