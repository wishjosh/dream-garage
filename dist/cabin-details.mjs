import * as T from './vendor/three.module.js';

// Reference-inspired finishing on the inspected source. No source positions,
// geometry attributes or camera proportions are changed.
export const CABIN_FINISH = Object.freeze({
 study_Velvet:{color:'#252b30',roughness:.96,metalness:0},
 study_plastic:{color:'#171e24',roughness:.76,metalness:.04},
 study_Antisorp_Chrome:{color:'#64717a',roughness:.36,metalness:.65},
 study_Black_Metal:{color:'#0a1015',roughness:.62,metalness:.12},
 study_leder_black:{color:'#151c22',roughness:.83,metalness:0},
 study_leder_yellow:{color:'#30383d',roughness:.72,metalness:.05},
 study_Black_Coat:{color:'#18242e',roughness:.48,metalness:.26},
 study_Lack:{color:'#243a49',roughness:.36,metalness:.4},
 study_lack:{color:'#243a49',roughness:.36,metalness:.4},
 study_Chrome:{color:'#aab5ba',roughness:.3,metalness:.78},
 study_Material:{color:'#343c42',roughness:.74,metalness:.08},
 study_Gallardo_logo:{color:'#8e9da3',roughness:.35,metalness:.65},
 study_emit_red:{color:'#c24e39',roughness:.7,metalness:0,emissive:'#7b1c0e',emissiveIntensity:.4},
 study_emit_blue:{color:'#849dba',roughness:.7,metalness:0,emissive:'#17374f',emissiveIntensity:.15}
});
export function finishCabinMaterials(root){
 const changed=new Set();
 root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(changed.has(m))continue;const profile=CABIN_FINISH[m.name];if(!profile)continue;
  m.color.set(profile.color);m.roughness=profile.roughness;m.metalness=profile.metalness;
  if(profile.emissive){m.emissive.set(profile.emissive);m.emissiveIntensity=profile.emissiveIntensity;}
  changed.add(m);
 }});
 return changed.size;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function dialNeedleAngle(value,maximum){
 return T.MathUtils.degToRad(225-clamp(Number.isFinite(value)?value:0,0,maximum)/maximum*270);
}
export const CABIN_DIALS=Object.freeze([
 {name:'rpm',center:[-.4791715,.7871778,-.728112],radius:.0382,tilt:-.454,offset:.018,max:8,step:1,label:'RPM ×1000',red:6.5},
 {name:'speed',center:[-.3213199,.7871778,-.728112],radius:.0382,tilt:-.454,offset:.018,max:240,step:40,label:'km/h',red:220},
 {name:'oil',center:[-.070722,.781801,-.977323],radius:.0237,tilt:-.332,offset:.013,max:10,step:2,label:'OIL',red:9},
 {name:'temp',center:[.008766,.781801,-.977323],radius:.0237,tilt:-.332,offset:.013,max:120,step:30,label:'°C',red:100},
 {name:'volts',center:[.088326,.781801,-.977323],radius:.0237,tilt:-.332,offset:.013,max:16,step:4,label:'V',red:15}
]);
export function createCabinDetails({root,eye}){
 const group=new T.Group();group.name='dream-cabin-details';root.add(group);
 const geometries=[],materials=[],textures=[],dials=[];
 const finishedMaterials=finishCabinMaterials(root);
 function dialTexture(d){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  const gradient=x.createRadialGradient(112,98,10,128,128,125);gradient.addColorStop(0,'#172027');gradient.addColorStop(1,'#04090d');
  x.fillStyle=gradient;x.beginPath();x.arc(128,128,127,0,Math.PI*2);x.fill();
  x.strokeStyle='#657077';x.lineWidth=3;x.beginPath();x.arc(128,128,122,0,Math.PI*2);x.stroke();
  const point=(value,r)=>{const a=dialNeedleAngle(value,d.max);return[128+Math.cos(a)*r,128-Math.sin(a)*r];};
  const count=Math.round(d.max/d.step)*4;
  for(let i=0;i<=count;i++){
   const v=i/count*d.max,major=i%4===0,a=point(v,major?95:102),b=point(v,112);
   x.strokeStyle=v>=d.red?'#e87759':'#cbd5d8';x.lineWidth=major?3:1.3;x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke();
   if(major){x.fillStyle=v>=d.red?'#e9957e':'#e1e8e9';x.font='600 17px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(Math.round(v)),...point(v,78));}
  }
  x.fillStyle='#9eacb2';x.font='600 15px sans-serif';x.textAlign='center';x.fillText(d.label,128,173);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;textures.push(t);return t;
 }
 for(const d of CABIN_DIALS){
  const g=new T.Group();g.name='dream-dial-'+d.name;g.position.fromArray(d.center);g.rotation.x=d.tilt;
  const normal=new T.Vector3(0,0,1).applyEuler(g.rotation);g.position.addScaledVector(normal,d.offset);group.add(g);
  const geometry=new T.CircleGeometry(d.radius,48);geometries.push(geometry);
  const faceMaterial=new T.MeshBasicMaterial({map:dialTexture(d),toneMapped:false});materials.push(faceMaterial);
  const face=new T.Mesh(geometry,faceMaterial);g.add(face);
  const needleGeometry=new T.BufferGeometry();needleGeometry.setAttribute('position',new T.Float32BufferAttribute([-.12*d.radius,-.025*d.radius,.0004,d.radius*.77,0,.0004,-.12*d.radius,.025*d.radius,.0004],3));
  geometries.push(needleGeometry);const red=new T.MeshBasicMaterial({color:'#fa6747',side:T.DoubleSide,toneMapped:false});materials.push(red);
  const needle=new T.Mesh(needleGeometry,red);g.add(needle);
  const hubGeometry=new T.CircleGeometry(d.radius*.085,16);geometries.push(hubGeometry);
  const hubMaterial=new T.MeshBasicMaterial({color:'#7d8587',toneMapped:false});materials.push(hubMaterial);
  const hub=new T.Mesh(hubGeometry,hubMaterial);hub.position.z=.0008;g.add(hub);dials.push({...d,group:g,face,needle});
 }
 const sideMirrors=[];
 for(const [nodeName,id]of [['source_door.001','left'],['source_door.000','right']]){
  const source=root.getObjectByName(T.PropertyBinding.sanitizeNodeName(nodeName));let original;
  source?.traverse(o=>{if(o.isMesh&&o.material.name==='study_mirrow')original=o;});
  if(!original)continue;
  original.geometry.computeBoundingBox();const center=original.geometry.boundingBox.getCenter(new T.Vector3());
  const pos=original.geometry.attributes.position,normals=original.geometry.attributes.normal,normal=new T.Vector3();
  for(let i=0;i<normals.count;i++)normal.add(new T.Vector3().fromBufferAttribute(normals,i));
  normal.normalize();if(normal.dot(eye.clone().sub(center))<0)normal.negate();
  const axisX=new T.Vector3(0,1,0).cross(normal).normalize(),axisY=normal.clone().cross(axisX).normalize();
  const g=original.geometry.clone(),uv=[],p=new T.Vector3();let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).sub(center);const x=p.dot(axisX),y=p.dot(axisY);uv.push(x,y);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  for(let i=0;i<uv.length;i+=2){uv[i]=(uv[i]-x0)/(x1-x0);uv[i+1]=(uv[i+1]-y0)/(y1-y0);}
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometries.push(g);
  const m=new T.MeshBasicMaterial({color:'#e4edf2',side:T.DoubleSide,toneMapped:false,fog:false});materials.push(m);
  const surface=new T.Mesh(g,m);surface.name='dream-live-side-mirror-'+id;surface.position.copy(normal).multiplyScalar(.0015);original.parent.add(surface);
  sideMirrors.push({id,surface,origin:center.clone(),aspect:(x1-x0)/(y1-y0),yaw:id==='left'?-.32:.32});
 }
 function update({kmh=0,rpm=950}={}){
  // Auxiliary needles show decorative normal-running positions, not simulated
  // oil, coolant or voltage telemetry. Speed and RPM track the game readout.
  const values={rpm:rpm/1000,speed:kmh,oil:5.8,temp:84,volts:13.8};
  for(const d of dials)d.needle.rotation.z=dialNeedleAngle(values[d.name],d.max);
 }
 function stats(){return{finishedMaterials,dials:dials.map(d=>({name:d.name,angle:d.needle.rotation.z,maximum:d.max,center:d.group.position.toArray()})),sideMirrors:sideMirrors.map(m=>({id:m.id,aspect:m.aspect})),sourceGeometryUnchanged:true};}
 function dispose(){group.removeFromParent();for(const m of sideMirrors)m.surface.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
 update();return{group,sideMirrors,update,stats,dispose};
}
