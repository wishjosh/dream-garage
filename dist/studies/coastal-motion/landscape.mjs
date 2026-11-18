import * as T from '../../vendor/three.module.js';
import {trackFrame} from '../../race-core.mjs';

const smooth=t=>Math.max(0,Math.min(1,t))**2*(3-2*Math.max(0,Math.min(1,t)));
export function coastalTerrain(scene,track,grass,stone){
  const b=track.bounds,pad=300,grid=11,cols=Math.ceil((b.xmax-b.xmin+2*pad)/grid)+1,rows=Math.ceil((b.zmax-b.zmin+2*pad)/grid)+1;
  const samples=track.frames.filter((f,i)=>i%5===0),positions=[],uv=[],colors=[],indices=[];
  function heightAt(x,z){
    let dist2=Infinity;
    for(const p of samples){const d=(p.x-x)**2+(p.z-z)**2;if(d<dist2)dist2=d;}
    const distance=Math.sqrt(dist2);
    if(distance<28)return -.42;
    const elevation=smooth((distance-23)/90);
    const land=smooth((x-b.xmin)/(b.xmax-b.xmin));
    const swale=1.4+1.4*Math.sin(x*.034+z*.016)+.85*Math.cos(z*.052-x*.012);
    const hill=land*(1.1+2.8*Math.sin(z*.011+x*.012));
    return -.42+elevation*(swale+hill)-(1-land)*elevation*1.65;
  }
  for(let iz=0;iz<rows;iz++)for(let ix=0;ix<cols;ix++){
    const x=b.xmin-pad+ix*grid,z=b.zmin-pad+iz*grid,y=heightAt(x,z);
    positions.push(x,y,z);uv.push(x/8,z/8);
    const color=new T.Color().setRGB(.76+.10*Math.sin(x/40),.72+.14*Math.cos(z/41),.55+.07*Math.cos((x+z)/55));
    colors.push(color.r,color.g,color.b);
    if(ix<cols-1&&iz<rows-1){const a=iz*cols+ix;indices.push(a,a+cols,a+1,a+1,a+cols,a+cols+1);}
  }
  function geometry(pos,uvs,cols,ind){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(ind);g.computeVertexNormals();return g;
  }
  scene.add(new T.Mesh(geometry(positions,uv,colors,indices),new T.MeshStandardMaterial({map:grass,vertexColors:true,roughness:.96})));
  // Exposed stratified stone sits behind the right-hand barrier on the first headland.
  const p=[],u=[],c=[],ind=[];
  for(const [start,end,side] of [[69,180,-1],[212,301,-1],[514,564,1],[667,722,1]]){
    const base=p.length/3,n=Math.ceil((end-start)/2.2);
    for(let i=0;i<=n;i++){
      const t=i/n,s=start+(end-start)*t,f=trackFrame(track,s);
      const strength=Math.min(1,Math.min(t,1-t)*9);
      const ridge=(1.74+.39*Math.sin(s*.13)+.27*Math.sin(s*.43)+.41*Math.sin(s*.047))*strength;
      const foot=9.55+.30*Math.sin(s*.17);
      const layers=[[foot,-.035],[foot+.16+.07*Math.sin(s*.7),ridge*.38],[foot+.39+.14*Math.cos(s*.61),ridge*.80],[foot+.8,ridge],[foot+3.9,ridge*.60],[foot+8,.34]];
      for(let j=0;j<layers.length;j++){
        const [o,h]=layers[j];p.push(f.x+side*o*f.rx,h,f.z+side*o*f.rz);u.push(s/3.5,(h+o*.46)/3.5);
        const v=.90+.12*Math.sin(i*1.8+j*.8);c.push(v*(j>3?.70:1),v*(j>3?.67:.88),v*(j>3?.47:.73));
        if(i<n&&j<layers.length-1){const a=base+i*layers.length+j,b=a+layers.length;ind.push(a,b,a+1,a+1,b,b+1);}
      }
    }
  }
  scene.add(new T.Mesh(geometry(p,u,c,ind),new T.MeshStandardMaterial({map:stone,color:'#d1bd9d',vertexColors:true,side:T.DoubleSide,roughness:.91})));
  return heightAt;
}
