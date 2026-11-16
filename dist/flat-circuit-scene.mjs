import * as T from './vendor/three.module.js';
import {nearestTrack,trackFrame} from './race-core.mjs';

const asphaltURL=new URL('./assets/materials/asphalt-color.jpg',import.meta.url).href;

function ribbon(scene,track,offset,width,y,material){
 const position=[],uv=[],index=[];
 for(let i=0;i<=track.frames.length;i++){
  const frame=track.frames[i%track.frames.length];
  for(const side of [-1,1]){
   const lateral=offset+side*width/2;
   position.push(frame.x+frame.rx*lateral,y,frame.z+frame.rz*lateral);
   uv.push(lateral/7,i/track.frames.length*track.length/7);
  }
  if(i<track.frames.length){
   const a=i*2;
   index.push(a,a+2,a+1,a+1,a+2,a+3);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setIndex(index);
 geometry.computeVertexNormals();
 scene.add(new T.Mesh(geometry,material));
}

export async function buildFlatCircuit(scene,track,{renderer}){
 const sky='#d0d9de';
 scene.background=new T.Color(sky);
 scene.fog=new T.Fog(sky,180,670);
 scene.environmentIntensity=.55;
 scene.add(new T.HemisphereLight('#eaf2ff','#6c7154',1.8));
 const sun=new T.DirectionalLight('#fff1dc',2.4);
 sun.position.set(-65,100,-110);
 scene.add(sun);

 const mat=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.88,...options});
 const asphalt=await new T.TextureLoader().loadAsync(asphaltURL);
 asphalt.colorSpace=T.SRGBColorSpace;
 asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;
 asphalt.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
 const ground=mat('#667b4a'),shoulder=mat('#969183'),road=mat('#b7b9bb',{map:asphalt});
 const white=mat('#f2eee1'),concrete=mat('#bdbcb3'),steel=mat('#46545b'),glass=mat('#536e75');
 const unit=new T.BoxGeometry();
 const batches=new Map();
 function box(material,x,y,z,w,h,d,yaw=0,color=null){
  if(!batches.has(material))batches.set(material,[]);
  batches.get(material).push({x,y,z,w,h,d,yaw,color});
 }
 function trackside(s,lateral,y,w,h,d,material,color){
  const f=trackFrame(track,s);
  box(material,f.x+f.rx*lateral,y,f.z+f.rz*lateral,w,h,d,Math.atan2(f.tx,f.tz),color);
 }

 const {xmin,xmax,zmin,zmax}=track.bounds;
 box(ground,(xmin+xmax)/2,-.2,(zmin+zmax)/2,xmax-xmin+850,.4,zmax-zmin+850);
 ribbon(scene,track,0,17.6,.024,shoulder);
 ribbon(scene,track,0,16.4,.045,road);
 for(const side of [-1,1])ribbon(scene,track,side*7.95,.13,.052,white);

 // Match the visible wall to the existing collision boxes.
 const count=Math.floor(track.length/5);
 const spacing=track.length/count;
 for(let i=0;i<count;i++){
  const s=i*spacing;
  for(const side of [-1,1]){
   trackside(s,side*8.8,.64,.45,1.15,spacing,concrete);
   trackside(s,side*7.63,.064,.47,.038,spacing-.13,white,i%2===0?'#d7443b':'#ffffff');
   if(i%4===0)trackside(s,side*9.04,1.7,.10,1.05,.10,steel);
  }
 }
 for(let row=0;row<2;row++)for(let col=0;col<16;col++){
  trackside(row*.56,col-7.5,.058,.99,.018,.56,white,(row+col)%2?'#24282d':'#ffffff');
 }
 for(let row=0;row<4;row++)for(const side of [-1,1]){
  trackside(5+row*7,side*2.3,.057,1.8,.011,.10,white);
 }

 // Low pit garages and a stepped stand face the starting straight.
 for(let i=0;i<5;i++){
  const s=16+i*8;
  const f=trackFrame(track,s);
  for(const side of [-1,1]){
   const x=f.x+f.rx*side*18,z=f.z+f.rz*side*18;
   if(nearestTrack(track,x,z).distance<14)continue;
   trackside(s,side*17,.025,15,.05,7.96,shoulder);
   if(side===1){
    trackside(s,side*18,1.65,7.2,3.3,7.9,concrete);
    trackside(s,side*14.33,1.35,.17,2.55,5.7,steel);
    trackside(s,side*18,3.46,8.0,.28,7.95,steel);
    trackside(s,side*18,3.92,6.8,.64,7.85,glass);
   }else{
    for(let step=0;step<5;step++){
     const rise=.48+step*.49;
     trackside(s,side*(15.1+step*1.02),rise/2,1.1,rise,7.98,concrete);
     trackside(s,side*(15.1+step*1.02),rise+.10,.66,.20,7.48,steel);
    }
    trackside(s,side*19.8,2.4,.2,4.8,.2,steel);
    trackside(s,side*17.6,4.83,6.4,.18,7.98,steel);
   }
  }
 }
 trackside(1,-9.6,3.1,.35,6.2,.4,steel);
 trackside(1,9.6,3.1,.35,6.2,.4,steel);
 trackside(1,0,6.05,19.6,.55,.54,steel);
 for(let x=-1.6;x<=1.61;x+=.8)trackside(.65,x,5.63,.35,.28,.26,steel);

 const o=new T.Object3D();
 for(const [material,items] of batches){
  const mesh=new T.InstancedMesh(unit,material,items.length);
  items.forEach(({x,y,z,w,h,d,yaw,color},i)=>{
   o.position.set(x,y,z);
   o.scale.set(w,h,d);
   o.rotation.y=yaw;
   o.updateMatrix();
   mesh.setMatrixAt(i,o.matrix);
   if(color)mesh.setColorAt(i,new T.Color(color));
  });
  scene.add(mesh);
 }
 return {groundHeight:()=>0,tick(){},update(){},stats:()=>({kind:'flat-circuit'})};
}
