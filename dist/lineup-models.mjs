import * as T from './vendor/three.module.js';
import {LINEUP} from './lineup-shapes.mjs';
import {wheelAssembly,batchParts} from './lineup-wheels.mjs';
import {itemById} from './garage-core.mjs?v=circuit-lineup-1';

const mix=T.MathUtils.lerp;
const fractions=n=>Array.from({length:n+1},(_,i)=>i/n);
function interp(knots,x){
  const i=knots.findIndex(row=>row[0]>=x);
  if(i<=0)return knots[i<0?knots.length-1:0].slice(1);
  const a=knots[i-1],b=knots[i],t=(x-a[0])/(b[0]-a[0]);
  return a.slice(1).map((v,k)=>mix(v,b[k+1],t));
}
function surface(parent,mat,us,vs,point,uv,outward){
  const pos=[],tex=[],idx=[];
  for(const v of vs)for(const u of us){pos.push(...point(u,v));tex.push(...uv(u,v));}
  const n=us.length;
  for(let j=1;j<vs.length;j++)for(let i=1;i<n;i++){
    const d=j*n+i,a=d-n-1,b=d-n,c=d-1;idx.push(a,b,d,a,d,c);
  }
  // Keep the reflected sides lit from their own exterior normal.
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<idx.length;i+=3){
    a.fromArray(pos,3*idx[i]);b.fromArray(pos,3*idx[i+1]);c.fromArray(pos,3*idx[i+2]);
    normal.crossVectors(b.sub(a),c.sub(a));
    if(normal.dot(outward)<0)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.setIndex(idx);g.computeVertexNormals();
  const mesh=new T.Mesh(g,mat);parent.add(mesh);return mesh;
}
const basicUV=(u,v)=>[u,v];
function rectUV(rect,x,y){return [(x-rect[0])/(rect[2]-rect[0]),1-(y-rect[1])/(rect[3]-rect[1])];}
function finish(name,color,metalness,roughness,opts={}){
  const m=new T.MeshPhysicalMaterial({name,color,metalness,roughness,side:T.DoubleSide,...opts});return m;
}
function addTube(parent,material,points,radius){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  parent.add(new T.Mesh(new T.TubeGeometry(path,Math.max(8,points.length*2),radius,6,false),material));
}
function ellipsoid(parent,material,x,y,z,rx,ry,rz){
  const g=new T.SphereGeometry(1,22,12);g.scale(rx,ry,rz);const mesh=new T.Mesh(g,material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function buildModel(id,maps,rearFascia){
  const spec=LINEUP[id],hatch=id==='rally-hatch';
  const body=new T.Group();body.name=id;
  const w=spec.width*.5,[left,right]=spec.bounds,mid=(left+right)/2;
  const meter=spec.height/(spec.ground-spec.roofPixel);
  const height=y=>(spec.ground-y)*meter, pixelY=y=>spec.ground-y/meter;
  const [wr,wf]=spec.wheelPixels,axleMid=((wr+wf)/2-mid)*spec.length/(right-left);
  const axleZ=[axleMid-spec.wheelbase/2,axleMid+spec.wheelbase/2];
  const zOf=x=>interp([[left,-spec.length/2],[wr,axleZ[0]],[wf,axleZ[1]],[right,spec.length/2]],x)[0];
  const shape=x=>{const [belt,roof,broad,cap]=interp(spec.sections,x);return {belt:height(belt),roof:height(roof),broad:broad*w,cap:cap*w};};
  const paint=finish('Body finish',spec.color,.45,.29,{clearcoat:.72,clearcoatRoughness:.22,envMapIntensity:.63});
  const rubber=finish('Window seals','#141a1d',.12,.53);
  const chrome=finish('Brightwork','#c8c8bf',.92,.22);
  const mirrorGlass=finish('Mirror glass','#b3c6ca',.91,.1);
  const tail=finish('Brake lenses','#801d12',.30,.32,{emissive:0xff210a,emissiveIntensity:.12});
  const panels={};
  for(const [view,map] of Object.entries(maps)){
    panels[view]=finish('Coachwork '+view,0xffffff,.03,.61,{map,clearcoat:.06,clearcoatRoughness:.38,specularIntensity:.19,envMapIntensity:.30});
    panels[view].userData.panel=true;
    panels[view].userData.hatch=hatch;
  }
  const wm={rim:finish('Wheel finish',spec.rim,hatch?.43:.77,hatch?.32:.25),
    tire:finish('Rubber tread','#18191b',.02,.84),sidewall:finish('Sidewall rings','#27282a',.04,.76),
    rotor:finish('Brake rotor','#93948d',.78,.42),hub:finish('Wheel hub','#464646',.77,.32),
    bolt:chrome,brake:finish('Brake',hatch?'#745247':'#69665b',.56,.4)};
  const rig={radius:spec.radius,wheels:[],collision:{halfWidth:w*.97,halfLength:spec.length*.48}};
  const trackX=w-spec.tire*.55;
  for(const [index,front] of [[1,true],[0,false]])for(const [side,label] of [[1,'l'],[-1,'r']]){
    const name='wheel_'+(front?'f':'r')+label;
    rig.wheels.push({name,front,position:[side*trackX,spec.radius,axleZ[index]]});
  }
  const endPull=(x,lateral,y=.36)=>{
    const z=zOf(x),edge=Math.max(0,(Math.abs(z)-(spec.length*.5-.40))/.40);
    const rake=z<0?(hatch?.15:.047):.042;
    const lift=Math.max(0,y-.36)/.75;
    return z-Math.sign(z)*edge*edge*(spec.endRound*Math.pow(Math.abs(lateral),2.6)+rake*lift);
  };
  function sill(x){
    const z=zOf(x),s=(x-left)/(right-left);
    let y=height(spec.sill)+.032*Math.pow(Math.abs(s*2-1),4);
    for(const center of axleZ){
      const dz=Math.abs(z-center),r=spec.radius+.024;
      // The well continues below its widest point. Keep the skirt clear of the complete tyre.
      if(dz<r+.022){
        const arch=spec.radius+Math.sqrt(Math.max(0,r*r-dz*dz));
        y=Math.max(y,mix(arch,y,Math.max(0,(dz-r)/.022)));
      }
    }
    return y;
  }
  function sideEdge(x){const s=shape(x);return s.broad-spec.beltInset;}
  function top(x,k){
    const s=shape(x),a=Math.abs(k);
    const cabin=Math.min(1,Math.max(0,(s.roof-s.belt)/.32));
    let camber=spec.crown*(1-a*a);
    if(x>spec.hood[0]&&x<spec.hood[1]){
      const t=(x-spec.hood[0])/(spec.hood[1]-spec.hood[0]);
      camber+=Math.sin(t*Math.PI)*Math.exp(-Math.pow((a-(hatch?.55:.48))/.13,2))*(hatch?.014:.030);
    }
    // The highest roof station retains the design height at the centreline.
    const y=s.roof+camber-spec.crown*cabin;
    return [k*s.cap,y,endPull(x,k*s.cap/w,y)];
  }
  const stations=[...new Set([...spec.sections.map(s=>s[0]),...spec.windscreens.flatMap(g=>[g.start,g.stop]),...fractions(140).map(t=>mix(left,right,t))])].sort((a,b)=>a-b);
  for(const side of [-1,1]){
    function lower(x,t){
      const s=shape(x),bottom=sill(x),arch=Math.min(1,Math.max(0,(bottom-.34)*3));
      const bulge=Math.sin(t*Math.PI)*(.028+.019*arch);
      const width=mix(s.broad-.048+arch*.037,sideEdge(x),t)+bulge;
      return [side*width,mix(bottom,s.belt,t),endPull(x,width/w,mix(bottom,s.belt,t))];
    }
    function upper(x,t){
      const s=shape(x),a=top(x,side),width=mix(sideEdge(x),s.cap,t)+.010*Math.sin(Math.PI*t);
      return [side*width,mix(s.belt,a[1],t),endPull(x,width/w,mix(s.belt,a[1],t))];
    }
    const uvFor=point=>(x,t)=>rectUV(spec.sideRect,x,pixelY(point(x,t)[1]));
    for(const fn of [lower,upper])surface(body,panels.side,stations,fractions(6),fn,uvFor(fn),new T.Vector3(side,0,0));
    surface(body,rubber,stations,[0,1],(x,t)=>{const p=lower(x,0);p[0]-=side*.15*t;p[1]+=.012*t;return p;},basicUV,new T.Vector3(0,-1,0));
    // Opaque inner wheel wells behind the cut fenders.
    for(const z of axleZ){
      const well=new T.Mesh(new T.CylinderGeometry(spec.radius*.975,spec.radius*.975,.046,52),rubber);
      well.rotation.z=Math.PI/2;well.position.set(side*(trackX-spec.tire*.58),spec.radius,z);body.add(well);
    }
  }
  let bonnetGeometry;
  const breaks=[left,...spec.windscreens.flatMap(g=>[g.start,g.stop]),right].sort((a,b)=>a-b);
  for(let i=1;i<breaks.length;i++){
    const start=breaks[i-1],stop=breaks[i],glass=spec.windscreens.find(g=>g.start===start&&g.stop===stop);
    const lid=stop===right?'front':start===left?'rear':null;
    const imageView=glass?.end||lid;
    const xs=stations.filter(x=>x>=start&&x<=stop);
    const across=fractions(18).map(t=>t*2-1);
    const panelUV=(k,x)=>{
      if(lid){
        const front=lid==='front';
        const base=spec.windscreens.find(g=>g.end===lid).lower;
        const cap=spec.fascia[lid],t=front?(x-start)/(stop-start):(stop-x)/(stop-start);
        const lo=mix(base[0]+8,cap[0]+3,t),hi=mix(base[1]-8,cap[1]-3,t);
        const y=mix(base[2]+(hatch?6:7),cap[2]-3,t);
        return rectUV(spec[lid+'Rect'],mix(lo,hi,(1+(front?k:-k))/2),y);
      }
      if(!glass)return [(k+1)/2,(x-start)/(stop-start)];
      let t=(x-start)/(stop-start);if(glass.end==='front')t=1-t;
      const [lo,hi,y]=glass.lower.map((v,j)=>mix(v,glass.upper[j],t));
      return rectUV(spec[glass.end+'Rect'],mix(lo,hi,(1+(glass.end==='front'?k:-k))/2),y);
    };
    const panel=surface(body,imageView?panels[imageView]:paint,across,xs,(k,x)=>top(x,k),panelUV,new T.Vector3(0,1,0));
    if(lid==='front')bonnetGeometry=panel.geometry.clone();
    if(glass){
      const trim=hatch?rubber:chrome;
      for(const x of [start,stop])addTube(body,trim,across.map(k=>top(x,k)),hatch?.009:.011);
      for(const k of [-1,1])addTube(body,trim,xs.map(x=>top(x,k)),.010);
    }
  }
  for(const end of ['front','rear']){
    const front=end==='front',x=front?right:left,dir=front?1:-1,s=shape(x),photo=spec.fascia[end];
    function face(k,t){
      // The soft corners wrap back into the side shell. The bumper sits proud of the grille.
      const shoulderY=s.belt,capY=top(x,1)[1],bottom=sill(x),y=mix(bottom,top(x,k)[1],t);
      let half;
      if(y>shoulderY)half=mix(sideEdge(x),s.cap,Math.min(1,(y-shoulderY)/Math.max(.001,capY-shoulderY)));
      else {const v=(y-bottom)/Math.max(.001,shoulderY-bottom);half=mix(s.broad-.048,sideEdge(x),v)+.028*Math.sin(Math.PI*v);}
      const pull=.026*Math.sin(t*Math.PI*2)**2*(1-Math.abs(k)**2);
      return [k*half,y,endPull(x,k*half/w,y)-dir*pull];
    }
    const uv=(k,t)=>rectUV(spec[end+'Rect'],mix(photo[0],photo[1],(1+(front?k:-k))/2),mix(photo[3],photo[2],t));
    const grid=fractions(28).map(t=>t*2-1);
    if(!front && rearFascia){
      surface(body,paint,grid,fractions(14),face,basicUV,new T.Vector3(0,0,-1));
      rearFascia({body,face,rubber,chrome,tail});
      continue;
    }
    surface(body,panels[end],grid,fractions(14),face,uv,new T.Vector3(0,0,dir));
    if(!front)for(const [a,b,t] of spec.tailLights){
      const lens=(k,v)=>{const p=face(k,v);p[2]-=.004;return p;};
      surface(body,tail,fractions(7).map(k=>mix(a,b,k)),[t-.008,t+.008],lens,basicUV,new T.Vector3(0,0,-1));
    }
  }
  for(const k of [-.72,.72]){
    const [a,b]=spec.hood;
    const points=fractions(21).map(t=>{const p=top(mix(a,b,t),k);p[1]+=.002;return p;});
    addTube(body,rubber,points,.003);
  }
  // Exterior mirrors, stems and reverse-facing glass are separate from the painted doors.
  for(const sign of [-1,1]){
    const [x,yp]=spec.mirrors,z=zOf(x),y=height(yp),mat=hatch?paint:chrome;
    addTube(body,mat,[[sign*(w-.10),y+.005,z],[sign*(w+.005),y+.05,z-.014],[sign*(w+.042),y+.069,z-.028]],.019);
    const cx=sign*(w+.052),cy=y+.09,cz=z-.02;
    ellipsoid(body,mat,cx,cy,cz,.084,.049,.080);
    ellipsoid(body,mirrorGlass,cx,cy,cz-.056,.065,.034,.019);
  }
  if(hatch){
    const z=zOf(237),y=height(242);
    for(const side of [-1,1])ellipsoid(body,rubber,side*w*.62,y+.016,z,.041,.033,.086);
    const wing=ellipsoid(body,paint,0,y+.052,z-.052,w*.80,.027,.124);wing.rotation.x=-.09;
  }
  const floor=new T.Mesh(new T.BoxGeometry(w*1.56,.033,spec.length*.90),rubber);
  floor.position.y=height(spec.sill)+.027;body.add(floor);batchParts(body);
  const templates=[wheelAssembly(spec,-1,wm,maps.side),wheelAssembly(spec,1,wm,maps.side)];
  for(const wheel of rig.wheels){
    const assembly=templates[wheel.position[0]>0?1:0].clone(true);
    assembly.name=wheel.name;assembly.position.fromArray(wheel.position);body.add(assembly);
  }
  const dimensions=new T.Box3().setFromObject(body).getSize(new T.Vector3()).toArray();
  return {exterior:body,rig,dimensions,bonnetGeometry};
}

export async function loadLineupModel(id,{rearFascia}={}){
  const loader=new T.TextureLoader();
  const entries=await Promise.all(['side','front','rear'].map(async view=>{
    const map=await loader.loadAsync(new URL('./assets/lineup/'+id+'-'+view+'.webp',import.meta.url).href);
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return [view,map];
  }));
  return buildModel(id,Object.fromEntries(entries),rearFascia);
}
export function dressLineup(root,loadout){
  const paint=itemById(loadout.paint)?.color,rim=itemById(loadout.wheels)?.color,owned=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const src=mesh.material;
    if(!src.userData.panel&&!['Body finish','Wheel finish','Brake lenses'].includes(src.name))return;
    if(!owned.has(src)){
      const mat=src.clone();
      if(paint&&src.name==='Body finish')mat.color.set(paint);
      if(rim&&src.name==='Wheel finish'){mat.map=null;mat.color.set(rim);}
      if(paint&&src.userData.panel){
        // Tint chromatic paint pixels only. Glass, chrome, rubber and lenses keep their finish.
        mat.onBeforeCompile=shader=>{
          shader.uniforms.garageTint={value:new T.Color(paint)};
          shader.fragmentShader='uniform vec3 garageTint;\n'+shader.fragmentShader;
          const channel=src.userData.hatch?'c.b - max(c.r,c.g)':'c.g - max(c.r,c.b)';
          const gain=src.userData.hatch?'2.9':'6.5';
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
            '#include <map_fragment>\n{ vec3 c=diffuseColor.rgb; float mask=smoothstep(.003,.045,'+channel+'); diffuseColor.rgb=mix(c,garageTint*clamp(max(c.r,max(c.g,c.b))*'+gain+',.035,1.8),mask); }');
        };
        mat.customProgramCacheKey=()=>src.userData.hatch?'hatch-paint':'muscle-paint';
      }
      owned.set(src,mat);
    }
    mesh.material=owned.get(src);
  });
  root.userData.dreamOwned={materials:[...owned.values()],geometry:[]};return root;
}
