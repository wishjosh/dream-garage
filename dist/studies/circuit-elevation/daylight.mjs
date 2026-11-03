import * as T from '../../vendor/three.module.js';
import {HDRLoader} from '../vehicle-compare/HDRLoader.js';
import {trackFrame} from '../../race-core.mjs';
import {DATA} from './data.mjs';
import {SITE,terrainHeight} from './terrain.mjs';

export const DAYLIGHT={id:'daylight',source:'Kloofendal 48d Partly Cloudy / Greg Zaal / Poly Haven CC0',bytes:1637206};
export function artReviewPose(track,id='start'){
 const s={start:0,pit:-80,corner:DATA.corners[0].s-100}[id];
 if(s===undefined)throw Error('Unknown art review position');
 const f=trackFrame(track,s),heading=Math.atan2(f.tx,f.tz);
 const side=id==='pit'?-7:-4.8,behind=id==='corner'?14:11;
 return {id,s,car:{x:f.x,z:f.z,heading},camera:[f.x+f.rx*side-f.tx*behind,4.1,f.z+f.rz*side-f.tz*behind],target:[f.x+f.tx*15,1.15,f.z+f.tz*15],fov:62};
}
// Same photographic sky provides visible background and all material reflections.
// Derive the directional shadow light from its brightest sky pixel, not an unrelated angle.
let pendingEnvironment;
export function daylightEnvironment(){return pendingEnvironment??=loadEnvironment();}
async function loadEnvironment(){
 const environment=await new HDRLoader().setDataType(T.FloatType).loadAsync(new URL('./assets/kloofendal_48d_partly_cloudy_1k.hdr',import.meta.url).href);
 environment.mapping=T.EquirectangularReflectionMapping;
 const {data,width,height}=environment.image;let peak=-1,px=0,py=0;
 for(let y=0;y<height/2;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,l=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;if(l>peak){peak=l;px=x;py=y;}}
 const longitude=((px+.5)/width-.5)*Math.PI*2,latitude=(.5-(py+.5)/height)*Math.PI;
 const direction=new T.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
 return {environment,direction};
}
export async function applyDaylight(scene,sun,hemisphere){
 const {environment,direction}=await daylightEnvironment();
 scene.environment=environment;scene.background=environment;scene.environmentIntensity=.65;scene.backgroundIntensity=.8;
 scene.fog=new T.Fog('#bcc9cf',500,2100);hemisphere.intensity=.55;hemisphere.color.set('#dce7ef');hemisphere.groundColor.set('#706a55');
 sun.color.set('#fff4e5');sun.intensity=2;sun.target.position.set(0,0,80);sun.position.copy(sun.target.position).addScaledVector(direction,310);
 Object.assign(sun.shadow.camera,{left:-220,right:220,top:250,bottom:-250,near:1,far:700});sun.shadow.normalBias=.08;
 return {...DAYLIGHT,sun:direction.toArray(),environment:'shared photographic sky/reflections'};
}
export function groundTint(x,z,grass){
 const broad=.5+.5*Math.sin(x*.019+Math.sin(z*.012)*1.4)*Math.cos(z*.017);
 const fine=.5+.5*Math.sin(x*.11+z*.08);
 return grass ? [.69+broad*.22,.77+broad*.20,.55+broad*.20] : [.84+fine*.08,.83+fine*.08,.78+fine*.08];
}

// Distant landscape starts outside the fenced site and its existing ground apron.
// No driving surface, obstacle, or collision terrain is moved.
export function backdropHeight(distance,x,z){
 const fade=Math.min(1,Math.max(0,distance/200));
 return fade*fade*(3-2*fade)*(30+65*(.5+.5*Math.sin(x*.0035+z*.0048))+32*Math.cos(x*.009-z*.003));
}
export function installBackdrop(scene,material){
 const bounds={left:Math.min(...SITE.map(p=>p.x))-100,right:Math.max(...SITE.map(p=>p.x))+100,back:Math.min(...SITE.map(p=>p.z))-100,front:Math.max(...SITE.map(p=>p.z))+100};
 const positions=[],uv=[],colors=[],indices=[],steps=96,layers=20;
 const perimeter=[{x:bounds.left,z:bounds.back},{x:bounds.right,z:bounds.back},{x:bounds.right,z:bounds.front},{x:bounds.left,z:bounds.front}];
 for(let side=0;side<4;side++){
  const a=perimeter[side],b=perimeter[(side+1)%4],start=positions.length/3;
  for(let j=0;j<=layers;j++)for(let i=0;i<=steps;i++){
   const t=i/steps,d=j/layers*1400,expansion=1+d/Math.max(bounds.right-bounds.left,bounds.front-bounds.back)*2;
   const cx=(bounds.left+bounds.right)/2,cz=(bounds.back+bounds.front)/2;
   const x=cx+(a.x+(b.x-a.x)*t-cx)*expansion,z=cz+(a.z+(b.z-a.z)*t-cz)*expansion;
   positions.push(x,terrainHeight(x,z)+.041+backdropHeight(d,x,z),z);uv.push(x/7,z/7);colors.push(...groundTint(x,z,true));
   if(i<steps&&j<layers){const k=start+j*(steps+1)+i;indices.push(k,k+steps+1,k+1,k+1,k+steps+1,k+steps+2);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 // Perimeter winding points away from the site; double-sided ground is intentional.
 const m=material.clone();m.vertexColors=true;m.side=T.DoubleSide;const mesh=new T.Mesh(g,m);mesh.name='Distant landscape outside circuit boundary';scene.add(mesh);
 return {bounds,triangles:indices.length/3,drivable:false};
}
