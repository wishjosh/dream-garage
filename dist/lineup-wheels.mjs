import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Merge static parts by finish once. The four wheel pivots and fixed calipers stay independent.
export function batchParts(root){
  root.updateMatrixWorld(true);
  const groups=new Map();
  for(const mesh of [...root.children]){
    if(!mesh.isMesh)continue;
    const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
    g.applyMatrix4(mesh.matrix);g.deleteAttribute('uv1');
    if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if(!groups.has(mesh.material))groups.set(mesh.material,[]);
    groups.get(mesh.material).push(g);root.remove(mesh);mesh.geometry.dispose();
  }
  for(const [material,parts] of groups){
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    const mesh=new T.Mesh(geometry,material);mesh.name=material.name;root.add(mesh);
  }
}
export function wheelAssembly(spec,side,materials,map){
  const coated={};
  for(const key of ['rim','rotor','tire','sidewall','hub','bolt']){
    const m=materials[key].clone();m.map=map;m.color.set(0xffffff);m.metalness=key==='rim'?.20:.08;
    m.roughness=key==='tire'?.84:.57;m.envMapIntensity=.30;coated[key]=m;
  }
  materials={...materials,...coated};
  const group=new T.Group(),radius=spec.radius,half=spec.tire/2,rimR=radius*.72;
  function piece(geom,mat,x=0,y=0,z=0){
    const mesh=new T.Mesh(geom,mat);mesh.position.set(x*side,y,z);group.add(mesh);return mesh;
  }
  function turned(points,mat){
    const geometry=new T.LatheGeometry(points.map(([x,r])=>new T.Vector2(r,x*side)),56);
    const m=piece(geometry,mat);m.rotation.z=-Math.PI/2;
  }
  turned([[-half*.88,rimR*.94],[-half,rimR*1.07],[-half*.98,radius*.91],
    [-half*.77,radius*.99],[-half*.45,radius],[half*.5,radius],[half*.81,radius*.983],
    [half*.98,radius*.93],[half,radius*.85],[half*.97,rimR]],materials.tire);
  for(const p of [.8,.92])turned([[half*.97,radius*p],[half*1.007,radius*(p+.006)],[half*.98,radius*(p+.014)]],materials.sidewall);
  turned([[-half*.93,rimR],[half*.90,rimR],[half*1.02,rimR*.985],[half*1.035,rimR*.945],[half*.79,rimR*.88],[half*.40,rimR*.86]],materials.rim);
  function disc(rad,depth,x,mat){
    const m=piece(new T.CylinderGeometry(rad,rad,depth,48),mat,x);m.rotation.z=Math.PI/2;return m;
  }
  disc(rimR*.83,.018,half*.34,materials.rotor);
  disc(rimR*.48,.021,half*.43,materials.hub);
  const caliper=piece(new T.BoxGeometry(.07,radius*.39,.058),materials.brake,half*.53,.022,-rimR*.72);
  caliper.rotation.x=.18;
  function spoke(angle){
    const classic=spec.spokes===5;
    const pts=[[.15,-.10],[.36,-.14],[.72,-(classic?.15:.081)],[.94,-.095],[1,-.075],[1,.075],[.80,.10],[.45,.11],[.21,.15]];
    const shape=new T.Shape();pts.forEach(([r,w],i)=>shape[i?'lineTo':'moveTo'](w*rimR,r*rimR));shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.020,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:2,curveSegments:2});
    // Local radial direction is Y. The front face dishes inward towards the hub.
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){const w=pos.getX(i),r=pos.getY(i),d=pos.getZ(i);
      pos.setXYZ(i,side*(half*.42+d+r*.21),r*Math.cos(angle)-w*Math.sin(angle),r*Math.sin(angle)+w*Math.cos(angle));}
    g.computeVertexNormals();piece(g,materials.rim);
  }
  for(let i=0;i<spec.spokes;i++)spoke((i+(spec.spokes===8?.5:0))*2*Math.PI/spec.spokes);
  disc(rimR*.255,.03,half*.65,materials.rim);disc(rimR*.14,.025,half*.85,materials.hub);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,m=piece(new T.CylinderGeometry(.009,.010,.014,6),materials.bolt,half*.84,.042*Math.cos(a),.042*Math.sin(a));m.rotation.z=Math.PI/2;}
  const hatch=spec.spokes===8,scale=(hatch?47.7:54.9)/radius;
  const cx=hatch?596.3:680.0,cy=hatch?384.9:165.1,[x0,y0,x1,y1]=spec.sideRect;
  // Register the finish to the sculpted face (including recesses), so highlights, bead and
  // machining details remain aligned as the independent wheel rotates or steers.
  for(const mesh of group.children){
    if(!mesh.material.map)continue;
    mesh.updateMatrix();
    const g=mesh.geometry,pos=g.attributes.position,uv=g.attributes.uv,pt=new T.Vector3();
    for(let i=0;i<pos.count;i++){
      pt.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrix);
      const rad=Math.hypot(pt.y,pt.z),factor=Math.min(1,radius*.982/(rad||1));
      uv.setXY(i,(cx+pt.z*scale*factor-x0)/(x1-x0),1-(cy-pt.y*scale*factor-y0)/(y1-y0));
    }
  }
  batchParts(group);return group;
}
