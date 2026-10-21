import * as T from './vendor/three.module.js';

// Camera-local, independently modelled interiors. All static parts are batched
// by material. The app supplies a live render target for the rear-view mirror.
export function createCockpit(camera) {
 const group=new T.Group();group.name='dream-cockpit';camera.add(group);
 const geometries=[],materials=[],textures=[];
 const material=(color,roughness=.7,metalness=0,extra={})=>{
  const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});materials.push(m);return m;
 };
 const basic=(color,extra={})=>{const m=new T.MeshBasicMaterial({color,...extra});materials.push(m);return m;};
 function pattern(type){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle=type==='carbon'?'#343b40':'#46494b';x.fillRect(0,0,128,128);
  if(type==='carbon'){
   for(let row=0;row<16;row++)for(let col=0;col<16;col++){
    const a=(row+col)%2;x.fillStyle=a?'#62686c':'#252c31';x.fillRect(col*8,row*8,8,8);
    x.fillStyle=a?'#4b5257':'#333b40';for(let k=1;k<8;k+=3)x.fillRect(col*8+k,row*8,1,8);
   }
  }else{
   for(let i=0;i<2500;i++){const n=(i*193+37)%255;x.fillStyle=`rgba(${n},${n},${n},.14)`;x.fillRect((i*61)%128,(i*89+Math.floor(i/128)*3)%128,1,1);}
  }
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(type==='carbon'?8:5,type==='carbon'?8:5);textures.push(t);return t;
 }
 const leather=material('#87949c',.9,.02,{map:pattern('leather'),emissive:'#102331',emissiveIntensity:.12});
 const carbon=material('#58666d',.5,.22,{map:pattern('carbon')});
 const shell=material('#0c151d',.55,.25),rubber=material('#172027',.94);
 const silver=material('#b0c4ce',.32,.8),darkSilver=material('#536572',.38,.65);
 const mint=basic('#6affcf'),white=basic('#e9faff'),warm=basic('#ffb567');
 const paintMaterial=material('#d83845',.28,.45,{emissive:'#4d0a10',emissiveIntensity:.08});
 const tubeGeometry=(points,r=.008,closed=false,segments=32)=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'catmullrom',.15),segments,r,5,closed);
 const block=(w,h,d,x=0,y=0,z=0)=>new T.BoxGeometry(w,h,d).translate(x,y,z);
 function silhouette(points,depth=.04,bevel=.012){
  const shape=new T.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});geo.translate(0,0,-depth*.5);return geo;
 }
 function bevelBox(w,h,d,x,y,z,bevel=.012){return silhouette([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],d,bevel).translate(x,y,z);}
 function bar(a,b,r=.009){const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);return new T.CylinderGeometry(r,r,direction.length(),6).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize())).translate(...start.add(end).multiplyScalar(.5).toArray());}
 function facet(points){const a=new T.Vector3(...points[0]),b=new T.Vector3(...points[1]),c=new T.Vector3(...points[2]);if(b.sub(a).cross(c.sub(a)).dot(a.clone().negate())<0)points=[...points].reverse();const p=[],uv=[];for(let i=1;i<points.length-1;i++){p.push(...points[0],...points[i],...points[i+1]);uv.push(0,0,i/(points.length-1),1,(i+1)/(points.length-1),1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
 function batch(parent){
  const parts=new Map();
  return {
   add(geo,mat){if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(geo);},
   finish(){
    for(const [mat,list] of parts){
     const attrs={position:[],normal:[],uv:[]};
     for(const source of list){
      const g=source.index?source.toNonIndexed():source;
      for(const key of Object.keys(attrs)){const a=g.getAttribute(key);if(a)attrs[key].push(a.array);}
      if(g!==source)g.dispose();source.dispose();
     }
     const g=new T.BufferGeometry();
     for(const [key,arrays] of Object.entries(attrs)){const length=arrays.reduce((sum,a)=>sum+a.length,0),result=new Float32Array(length);let offset=0;for(const a of arrays){result.set(a,offset);offset+=a.length;}g.setAttribute(key,new T.BufferAttribute(result,key==='uv'?2:3));}
     g.computeBoundingSphere();geometries.push(g);const mesh=new T.Mesh(g,mat);mesh.frustumCulled=false;parent.add(mesh);
    }
   }
  };
 }
 const supercar=new T.Group();supercar.name='tavaculo-cockpit';group.add(supercar);
 const formula=new T.Group();formula.name='f2002-cockpit';group.add(formula);
 // Independently authored from a small Gallardo interior reference render;
 // no Gallardo mesh, texture, badge or measured interior has been imported.
 // The eye, steering shaft and instruments share an axis. Left-hand seating
 // is conveyed by the nearby door/pillar and the long passenger dashboard.
 function fineLeather(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),pixels=x.createImageData(128,128);let seed=1931;
  for(let i=0;i<128*128;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const noise=seed>>>0;const v=174+noise%17-(noise%31===0?19:0);pixels.data.set([v,v,v,255],i*4);}
  x.putImageData(pixels,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);textures.push(t);return t;
 }
 const cabinLeather=material('#30383e',.79,.03,{map:fineLeather(),bumpScale:.0015});
 cabinLeather.bumpMap=cabinLeather.map;
 const cabinCarbon=material('#303639',.5,.23,{map:pattern('carbon')});cabinCarbon.map.repeat.set(18,18);
 const trim=material('#7f898e',.32,.64),stitch=material('#626a6e',.9);
 const ambient=basic('#8aa29c');
 function loftPillar(points,widths,depths){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),p=[],uv=[],idx=[];
  const section=[[-1,-.45],[-.82,-1],[.74,-1],[1,-.43],[1,.48],[.79,1],[-.73,1],[-1,.42]];
  const steps=24,sides=section.length;
  for(let i=0;i<=steps;i++){
   const t=i/steps,c=curve.getPoint(t),d=curve.getTangent(t),n=new T.Vector3(-d.y,d.x,0).normalize();
   const a=t*(widths.length-1),lo=Math.min(widths.length-2,Math.floor(a)),f=a-lo;
   const w=T.MathUtils.lerp(widths[lo],widths[lo+1],f),depth=T.MathUtils.lerp(depths[lo],depths[lo+1],f);
   for(let j=0;j<=sides;j++){const [across,back]=section[j%sides];const q=c.clone().addScaledVector(n,across*w);q.z+=back*depth;p.push(q.x,q.y,q.z);uv.push(j/sides,t*2);}
  }
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,a+1,b,a+1,b+1,b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
 }
 const cabinFill=new T.PointLight('#cbdbe8',.8,3.5,1.5);cabinFill.position.set(-.45,.15,-.25);supercar.add(cabinFill);
 const carBatch=batch(supercar);
 // A low continuous leather shelf falls away toward the passenger side.
 carBatch.add(silhouette([[-1.52,-1.4],[2.7,-1.4],[2.7,-.45],[1.8,-.37],[.68,-.30],[.37,-.28],[-.47,-.28],[-.86,-.33],[-1.52,-.45]],.36,.035).translate(0,0,-1.53),cabinLeather);
 carBatch.add(facet([[-1.45,-.36,-1.73],[-.49,-.26,-1.77],[-.42,-.41,-1.09],[-1.04,-.50,-.99]]),cabinLeather);
 carBatch.add(facet([[.37,-.27,-1.77],[2.65,-.45,-2.03],[2.3,-.55,-1.20],[.40,-.46,-1.09]]),cabinLeather);
 carBatch.add(silhouette([[-1.35,-1.4],[2.5,-1.4],[2.5,-.59],[.53,-.48],[.35,-.56],[-.48,-.56],[-1.35,-.56]],.10,.022).translate(0,0,-1.03),cabinLeather);
 carBatch.add(tubeGeometry([[.44,-.47,-1.04],[.92,-.49,-1.11],[1.74,-.52,-1.17],[2.30,-.58,-1.18]],.0024,false,32),stitch);
 carBatch.add(tubeGeometry([[-1.19,-.50,-.99],[-.83,-.435,-1.07],[-.49,-.407,-1.14]],.0025,false,20),stitch);
 carBatch.add(tubeGeometry([[.5,-.38,-1.41],[1.30,-.41,-1.51],[2.3,-.49,-1.66]],.0025,false,28),stitch);
 // One gently bowed, faintly tinted pane; no refraction or extra screen pass.
 const glassPositions=[],glassUV=[],glassIndex=[],glassU=12,glassV=8;
 for(let row=0;row<=glassV;row++)for(let col=0;col<=glassU;col++){
  const u=col/glassU,v=row/glassV,x=T.MathUtils.lerp(-.98+u*3.40,-.63+u*1.92,v),y=T.MathUtils.lerp(-.225-.08*u,.55,v),z=T.MathUtils.lerp(-1.65-.18*u,-.80-.18*u,v)-.055*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
  glassPositions.push(x,y,z);glassUV.push(u,v);
 }
 for(let row=0;row<glassV;row++)for(let col=0;col<glassU;col++){const a=row*(glassU+1)+col,b=a+glassU+1;glassIndex.push(a,a+1,b,a+1,b+1,b);}
 const glassGeometry=new T.BufferGeometry();glassGeometry.setAttribute('position',new T.Float32BufferAttribute(glassPositions,3));glassGeometry.setAttribute('uv',new T.Float32BufferAttribute(glassUV,2));glassGeometry.setIndex(glassIndex);glassGeometry.computeVertexNormals();geometries.push(glassGeometry);
 const windshield=new T.Mesh(glassGeometry,material('#c4d8dc',.24,.03,{transparent:true,opacity:.022,depthWrite:false,envMapIntensity:.10}));windshield.name='curved-windscreen';supercar.add(windshield);
 // Short parked wipers sit just above the lower seal, outside the sight line.
 carBatch.add(tubeGeometry([[-.70,-.216,-1.606],[-.40,-.183,-1.654],[-.13,-.184,-1.682]],.007,false,20),rubber);
 carBatch.add(bar([-.66,-.230,-1.58],[-.40,-.188,-1.648],.0045),darkSilver);
 carBatch.add(tubeGeometry([[.52,-.208,-1.72],[.83,-.218,-1.755],[1.11,-.245,-1.781]],.007,false,20),rubber);
 carBatch.add(bar([.59,-.238,-1.69],[.83,-.224,-1.747],.0045),darkSilver);
 // Recessed defroster slots and glass sealing strip follow the windscreen base.
 carBatch.add(tubeGeometry([[-.93,-.235,-1.62],[0,-.188,-1.77],[1.20,-.245,-1.87],[2.36,-.36,-1.90]],.016,false,44),rubber);
 for(let i=0;i<12;i++)carBatch.add(block(.074,.005,.025,-.50+i*.11,-.211,-1.67),shell);
 function roundVent(x,y,z,r,angle=0){
  const transform=g=>g.rotateY(angle).translate(x,y,z);
  // The dark barrel, circular lip and recessed vanes are separate depths.
  carBatch.add(transform(new T.CylinderGeometry(r,r*.94,.086,32).rotateX(Math.PI/2)),cabinLeather);
  carBatch.add(transform(new T.TorusGeometry(r*.91,r*.073,6,36).translate(0,0,.050)),trim);
  carBatch.add(transform(new T.CircleGeometry(r*.83,32).translate(0,0,.044)),shell);
  for(let i=-2;i<=2;i++){const y=i*r*.27,w=2*Math.sqrt((r*.77)**2-y*y);carBatch.add(transform(bevelBox(w,.007,.018,0,y,.062,.002)),darkSilver);}
  carBatch.add(transform(bevelBox(.014,r*.88,.020,r*.10,0,.080,.004)),trim);
 }
 roundVent(-.84,-.48,-1.12,.122,.18);roundVent(.73,-.47,-1.16,.116,-.14);roundVent(1.12,-.49,-1.21,.116,-.18);
 const consolePose=g=>g.rotateY(-.26).rotateX(-.14).translate(.66,-.69,-.96);
 carBatch.add(consolePose(silhouette([[-.20,-.45],[.24,-.45],[.21,.20],[.14,.28],[-.14,.28],[-.22,.19]],.13,.028)),cabinLeather);
 carBatch.add(consolePose(silhouette([[-.145,-.29],[.16,-.29],[.14,.19],[-.13,.19]],.035,.01).translate(0,0,.084)),cabinCarbon);
 carBatch.add(consolePose(bevelBox(.23,.135,.016,0,.097,.111,.012)),shell);
 for(const x of [-.075,0,.075]){carBatch.add(consolePose(new T.CylinderGeometry(.018,.018,.022,12).rotateX(Math.PI/2).translate(x,-.052,.122)),trim);carBatch.add(consolePose(block(.003,.014,.006,x,-.044,.139)),white);}
 carBatch.add(consolePose(bevelBox(.086,.045,.025,.01,-.16,.126,.009)),trim);
 carBatch.add(consolePose(bevelBox(.042,.021,.009,.01,-.157,.144,.004)),shell);
 // A broad sculpted door shoulder is close to the driver's left arm.
 carBatch.add(facet([[-1.22,-.30,-1.29],[-.70,-.47,-.53],[-.61,-.86,-.42],[-1.45,-1.20,-1.4]]),cabinLeather);
 carBatch.add(tubeGeometry([[-1.08,-.305,-1.30],[-.87,-.39,-.90],[-.67,-.50,-.51]],.031,false,28),cabinLeather);
 carBatch.add(tubeGeometry([[-1.075,-.312,-1.295],[-.865,-.397,-.895],[-.665,-.507,-.505]],.003,false,28),stitch);
 carBatch.add(bevelBox(.17,.033,.038,-.80,-.59,-.69,.009).rotateY(.05),trim);
 carBatch.add(bevelBox(.25,.075,.085,-.76,-.71,-.66,.022),cabinCarbon);
 // Flattened, bevel-edged sections taper toward the swept-back roof.
 // The driver-side base spreads into the dashboard instead of ending in a pole.
 const leftPillar=[[-1.00,-.38,-1.55],[-.96,-.17,-1.34],[-.84,.10,-1.06],[-.69,.37,-.75],[-.60,.55,-.61]];
 const rightPillar=[[1.90,-.39,-1.74],[1.80,-.15,-1.52],[1.58,.12,-1.25],[1.33,.40,-.96],[1.18,.57,-.78]];
 carBatch.add(loftPillar(leftPillar,[.17,.105,.082,.074,.078],[.042,.033,.027,.025,.028]),cabinLeather);
 carBatch.add(loftPillar(rightPillar,[.105,.076,.060,.054,.060],[.032,.025,.022,.021,.024]),cabinLeather);
 carBatch.add(tubeGeometry(leftPillar.map(([x,y,z],i)=>[x+[.14,.092,.071,.064,.068][i],y-.018,z+.029]),.008,false,32),rubber);
 carBatch.add(tubeGeometry(leftPillar.map(([x,y,z],i)=>[x+[.12,.074,.052,.045,.049][i],y-.014,z+.041]),.002,false,32),stitch);
 carBatch.add(tubeGeometry(rightPillar.map(([x,y,z],i)=>[x-[.088,.064,.051,.046,.050][i],y-.01,z+.024]),.007,false,32),rubber);
 carBatch.add(facet([[-1.18,-.42,-1.57],[-.83,-.38,-1.51],[-.79,-.48,-1.15],[-1.07,-.54,-1.10]]),cabinLeather);
 // A thin curved header preserves the wide forward opening.
 carBatch.add(silhouette([[-2,.63],[-.80,.48],[-.48,.425],[0,.38],[.62,.395],[1.20,.46],[2.6,.72],[2.6,2],[-2,2]],.075,.016).translate(0,.055,-.91),cabinLeather);
 carBatch.add(tubeGeometry([[-.70,.45,-.88],[-.45,.411,-.91],[0,.366,-.92],[.62,.381,-.92],[1.16,.448,-.92]],.009,false,44).translate(0,.055,0),rubber);
 carBatch.finish();
 // A gently domed twin-binnacle hood surrounds two round analogue dials.
 // Their digital speed and gear remain central for small phone screens.
 const driverPod=new T.Group();driverPod.name='driver-instrument-pod';supercar.add(driverPod);
 const pod=batch(driverPod),hoodShape=new T.Shape();
 hoodShape.moveTo(-.45,-.49);hoodShape.lineTo(.45,-.49);hoodShape.lineTo(.45,-.29);
 hoodShape.bezierCurveTo(.43,-.13,.26,-.12,.10,-.18);hoodShape.quadraticCurveTo(0,-.215,-.10,-.18);hoodShape.bezierCurveTo(-.26,-.12,-.43,-.13,-.45,-.29);hoodShape.closePath();
 const hoodBody=new T.ExtrudeGeometry(hoodShape,{depth:.09,steps:1,bevelEnabled:true,bevelThickness:.012,bevelSize:.014,bevelSegments:2,curveSegments:20});hoodBody.translate(0,0,-1.17);pod.add(hoodBody,cabinLeather);
 const hoodFront=[[-.45,-.30,-1.005],[-.40,-.20,-1.005],[-.27,-.155,-1.005],[-.12,-.18,-1.005],[0,-.195,-1.005],[.12,-.18,-1.005],[.27,-.155,-1.005],[.40,-.20,-1.005],[.45,-.30,-1.005]];
 const hoodCurve=new T.CatmullRomCurve3(hoodFront.map(p=>new T.Vector3(...p))),hp=[],hu=[],hi=[];
 for(let row=0;row<2;row++)for(let i=0;i<=40;i++){const p=hoodCurve.getPoint(i/40);hp.push(p.x*(row?.92:1),p.y+(row?.008:0),row?-1.27:p.z);hu.push(i/40,row);}
 for(let i=0;i<40;i++)hi.push(i,i+1,i+41,i+1,i+42,i+41);
 const hoodTop=new T.BufferGeometry();hoodTop.setAttribute('position',new T.Float32BufferAttribute(hp,3));hoodTop.setAttribute('uv',new T.Float32BufferAttribute(hu,2));hoodTop.setIndex(hi);hoodTop.computeVertexNormals();pod.add(hoodTop,cabinLeather);
 pod.add(tubeGeometry(hoodFront,.008,false,44),rubber);
 for(const x of [-.2594,.2594])pod.add(new T.TorusGeometry(.105,.0045,6,40).translate(x,-.345,-1.032),trim);
 pod.finish();
 const carWheel=new T.Group();carWheel.name='supercar-steering-wheel';carWheel.position.set(0,-.44,-.66);supercar.add(carWheel);
 const cw=batch(carWheel);
 const wheelCenter=new T.Group();wheelCenter.name='supercar-wheel-hub-spokes';carWheel.add(wheelCenter);
 const core=batch(wheelCenter);
 const dRim=[[-.28,-.27,0],[-.355,-.13,0],[-.365,.06,0],[-.300,.245,0],[-.16,.345,0],[0,.365,0],[.16,.345,0],[.300,.245,0],[.365,.06,0],[.355,-.13,0],[.28,-.27,0],[.14,-.306,0],[-.14,-.306,0]];
 cw.add(new T.TubeGeometry(new T.CatmullRomCurve3(dRim.map(p=>new T.Vector3(...p)),true,'catmullrom',.15),88,.035,10,true),cabinLeather);
 for(const side of [-1,1]){
  cw.add(tubeGeometry([[side*.327,-.10,.023],[side*.337,.06,.023],[side*.29,.20,.023]],.007,false,24),rubber);
  cw.add(tubeGeometry([[side*.326,-.18,.028],[side*.348,-.07,.028],[side*.344,.08,.028],[side*.286,.23,.028]],.002,false,28),stitch);
  cw.add(bevelBox(.032,.085,.018,side*.245,-.105,-.052,.007),trim);
  core.add(silhouette([[side*.105,-.055],[side*.325,-.030],[side*.332,-.092],[side*.13,-.135]],.032,.011).translate(0,0,.025),cabinCarbon);
  core.add(bevelBox(.068,.036,.014,side*.20,-.074,.050,.006),rubber);
  core.add(new T.CylinderGeometry(.009,.009,.006,10).rotateX(Math.PI/2).translate(side*.20,-.073,.062),trim);
 }
 core.add(silhouette([[-.045,-.095],[.045,-.095],[.059,-.29],[.026,-.312],[-.026,-.312],[-.059,-.29]],.032,.010).translate(0,0,.026),trim);
 core.add(silhouette([[-.025,-.14],[.025,-.14],[.030,-.285],[-.030,-.285]],.015,.005).translate(0,0,.051),cabinCarbon);
 core.add(silhouette([[-.095,.105],[.095,.105],[.135,.035],[.095,-.075],[0,-.12],[-.095,-.075],[-.135,.035]],.050,.028).translate(0,0,.059),cabinLeather);
 core.add(new T.TorusGeometry(.026,.0025,4,24).translate(0,.015,.116),trim);
 core.add(block(.024,.003,.004,0,.015,.119),stitch);
 cw.add(block(.008,.024,.009,0,.365,.033),stitch);
 cw.finish();core.finish();
 // The app owns the live rear-facing render target. This rounded surface uses
 // ordinary 0..1 UVs; horizontal mirror reversal belongs to that camera pass.
 const mirrorMount=new T.Group();mirrorMount.name='rear-view-mirror-mount';supercar.add(mirrorMount);
 const mirrorBody=batch(mirrorMount);
 mirrorBody.add(bevelBox(.45,.136,.048,0,0,-.014,.023),rubber);
 mirrorBody.add(bevelBox(.425,.112,.014,0,0,.013,.015),trim);
 mirrorBody.add(bar([.028,.065,-.02],[.034,.17,-.08],.012),shell);
 mirrorBody.add(bevelBox(.072,.038,.031,.034,.17,-.082,.009),shell);
 mirrorBody.add(bevelBox(.048,.018,.028,0,-.077,-.005,.005),shell);
 mirrorBody.finish();
 const mirrorShape=new T.Shape(),mw=.404,mh=.094,mr=.012;
 mirrorShape.moveTo(-mw/2+mr,-mh/2);mirrorShape.lineTo(mw/2-mr,-mh/2);mirrorShape.quadraticCurveTo(mw/2,-mh/2,mw/2,-mh/2+mr);mirrorShape.lineTo(mw/2,mh/2-mr);mirrorShape.quadraticCurveTo(mw/2,mh/2,mw/2-mr,mh/2);mirrorShape.lineTo(-mw/2+mr,mh/2);mirrorShape.quadraticCurveTo(-mw/2,mh/2,-mw/2,mh/2-mr);mirrorShape.lineTo(-mw/2,-mh/2+mr);mirrorShape.quadraticCurveTo(-mw/2,-mh/2,-mw/2+mr,-mh/2);
 const mirrorGeometry=new T.ShapeGeometry(mirrorShape,5),ma=mirrorGeometry.getAttribute('position'),mu=mirrorGeometry.getAttribute('uv');
 for(let i=0;i<ma.count;i++)mu.setXY(i,ma.getX(i)/mw+.5,ma.getY(i)/mh+.5);
 geometries.push(mirrorGeometry);
 const mirrorSurface=new T.Mesh(mirrorGeometry,basic('#b3c3cb',{toneMapped:false}));mirrorSurface.name='live-rear-view-surface';mirrorSurface.position.z=.039;mirrorMount.add(mirrorSurface);

 const formulaBatch=batch(formula);
 // Classic 2002 open cockpit: no halo; sculpted tub and tapered long nose.
 formulaBatch.add(silhouette([[-1.45,-1.12],[1.45,-1.12],[.70,-.62],[.42,-.47],[.29,-.47],[.23,-.77],[-.23,-.77],[-.29,-.47],[-.42,-.47],[-.70,-.62]],.5,.04).translate(0,0,-1.35),paintMaterial);
 formulaBatch.add(tubeGeometry([[-.42,-.57,-1.04],[-.32,-.48,-1.20],[0,-.455,-1.38],[.32,-.48,-1.20],[.42,-.57,-1.04]],.027,false,40),carbon);
 formulaBatch.add(tubeGeometry([[-.39,-.595,-1.02],[-.30,-.505,-1.18],[0,-.48,-1.35],[.30,-.505,-1.18],[.39,-.595,-1.02]],.009,false,40),darkSilver);
 const nose=new T.CylinderGeometry(.30,.13,2.2,4,1,false,Math.PI/4);nose.rotateX(Math.PI/2);nose.scale(1,.68,1);nose.translate(0,-.70,-2.35);formulaBatch.add(nose,paintMaterial);
 formulaBatch.add(block(.055,.012,1.6,0,-.53,-2.45),white);
 formulaBatch.add(bevelBox(1.55,.045,.25,0,-.96,-3.48,.018),carbon);
 formulaBatch.add(block(1.63,.015,.065,0,-.91,-3.45),white);
 for(const side of [-1,1]){
  formulaBatch.add(bevelBox(.025,.15,.40,side*.84,-.90,-3.44,.008),paintMaterial);
  formulaBatch.add(bar([side*.15,-.64,-2.0],[side*.90,-.72,-2.53],.012),carbon);
  formulaBatch.add(bar([side*.13,-.70,-2.8],[side*.90,-.72,-2.53],.012),carbon);
  formulaBatch.add(bar([side*.18,-.63,-1.82],[side*.92,-.87,-2.53],.009),silver);
  formulaBatch.add(bar([side*.36,-.56,-1.18],[side*.64,-.44,-1.42],.015),carbon);
  formulaBatch.add(bevelBox(.17,.075,.09,side*.66,-.43,-1.44,.02),paintMaterial);
  formulaBatch.add(bevelBox(.145,.052,.01,side*.66,-.43,-1.385,.008),darkSilver);
 }
 formulaBatch.finish();
 const formulaTires=[];
 for(const side of [-1,1]){
  const turn=new T.Group();turn.position.set(side*.91,-.72,-2.6);formula.add(turn);
  const roll=new T.Group();turn.add(roll);const b=batch(roll);
  const tire=new T.CylinderGeometry(.285,.285,.24,24,1);tire.rotateZ(Math.PI/2);b.add(tire,rubber);
  for(const d of [-.075,0,.075]){const groove=new T.TorusGeometry(.285,.0045,3,24);groove.rotateY(Math.PI/2);groove.translate(d,0,0);b.add(groove,shell);}
  const hub=new T.CylinderGeometry(.135,.135,.249,16);hub.rotateZ(Math.PI/2);b.add(hub,darkSilver);
  b.finish();formulaTires.push({turn,roll});
 }
 const formulaWheel=new T.Group();formulaWheel.name='formula-steering-wheel';formulaWheel.position.set(0,-.44,-.83);formula.add(formulaWheel);
 const fw=batch(formulaWheel);
 fw.add(silhouette([[-.23,.10],[-.11,.10],[-.07,.07],[.07,.07],[.11,.10],[.23,.10],[.25,.04],[.21,-.13],[.14,-.15],[.10,-.07],[-.10,-.07],[-.14,-.15],[-.21,-.13],[-.25,.04]],.045,.016),carbon);
 for(const side of [-1,1]){
  fw.add(tubeGeometry([[side*.19,-.12,.015],[side*.226,-.04,.018],[side*.23,.05,.018],[side*.207,.09,.018]],.027,false,20),leather);
  fw.add(bevelBox(.025,.15,.013,side*.15,-.015,-.05,.007),silver);
 }
 fw.add(bevelBox(.305,.13,.014,0,.006,.036,.007),shell);
 // The buttons and rotary knobs are decorative; all touch input stays on HUD.
 for(const [x,y,mat] of [[-.15,.063,mint],[.15,.063,warm],[-.15,-.055,white],[.15,-.055,mint]]){
  fw.add(new T.CylinderGeometry(.011,.011,.009,10).rotateX(Math.PI/2).translate(x,y,.052),mat);
 }
 fw.add(new T.CylinderGeometry(.019,.019,.015,12).rotateX(Math.PI/2).translate(0,-.082,.051),silver);
 fw.add(block(.004,.022,.007,0,-.08,.061),warm);fw.finish();
 function screen(parent,w,h,x,y,z,resolution=[768,256]){
  const canvas=document.createElement('canvas');canvas.width=resolution[0];canvas.height=resolution[1];
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=false;tex.minFilter=T.LinearFilter;textures.push(tex);
  const mat=basic('#ffffff',{map:tex,toneMapped:false});const geo=new T.PlaneGeometry(w,h);geometries.push(geo);
  const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);parent.add(mesh);return{canvas,tex,mesh};
 }
 const carScreen=screen(driverPod,.80,.250,0,-.340,-1.044,[1024,320]);
 const formulaScreen=screen(formulaWheel,.285,.109,0,.009,.056);
 const scratch=document.createElement('canvas');scratch.width=768;scratch.height=256;const ctx=scratch.getContext('2d');
 let lastInstrument=0,lastKey='',lastCar='',lastPaint='',lastTime=performance.now(),rollAngle=0;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function drawCluster(data,isFormula){
  const {kmh,gear,rpm,driveMode}=data;
  ctx.clearRect(0,0,768,256);ctx.fillStyle=isFormula?'#07110d':'#050d12';ctx.fillRect(0,0,768,256);
  const rpmRatio=clamp((rpm-900)/7100,0,1);
  const max=24;
  for(let i=0;i<max;i++){ctx.fillStyle=i/max<=rpmRatio?(i<16?'#6affcf':i<21?'#ffcb66':'#ff627a'):'#162b30';ctx.fillRect(28+i*30,18,23,12);}
  if(isFormula){
   ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle='#edfff7';ctx.font='750 180px system-ui, sans-serif';ctx.fillText(String(kmh),285,151);
   ctx.fillStyle='#6affcf';ctx.font='750 166px system-ui, sans-serif';ctx.fillText(gear,620,151);
   ctx.strokeStyle='#294b43';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(480,65);ctx.lineTo(480,238);ctx.stroke();
   formulaScreen.canvas.getContext('2d').drawImage(scratch,0,0);formulaScreen.tex.needsUpdate=true;return;
  }
  const c=carScreen.canvas.getContext('2d');c.clearRect(0,0,1024,320);c.fillStyle='#070a0b';c.fillRect(0,0,1024,320);
  function dial(cx,ratio,redline=false){
   const cy=166,r=127;c.fillStyle='#0b1012';c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
   c.strokeStyle='#3b4448';c.lineWidth=3;c.beginPath();c.arc(cx,cy,r-3,0,Math.PI*2);c.stroke();
   const start=Math.PI*.75,sweep=Math.PI*1.5;
   for(let i=0;i<=40;i++){const a=start+i/40*sweep,major=i%5===0,outer=r-14,inner=outer-(major?18:8);c.strokeStyle=redline&&i>=33?'#d86a61':major?'#e4e5de':'#697579';c.lineWidth=major?4:2;c.beginPath();c.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);c.lineTo(cx+Math.cos(a)*outer,cy+Math.sin(a)*outer);c.stroke();}
   const a=start+clamp(ratio,0,1)*sweep;c.save();c.translate(cx,cy);c.rotate(a);c.fillStyle='#e47663';c.beginPath();c.moveTo(-13,-3);c.lineTo(r-29,0);c.lineTo(-13,4);c.closePath();c.fill();c.restore();
   c.fillStyle='#aeb7b9';c.beginPath();c.arc(cx,cy,9,0,Math.PI*2);c.fill();c.fillStyle='#20282b';c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.fill();
  }
  dial(180,kmh/260);dial(844,rpm/8000,true);
  // The needles supply the classic analogue character; the large central
  // digits carry the information a child needs at a glance while steering.
  c.fillStyle='#11191b';c.fillRect(337,49,350,232);c.strokeStyle='#273237';c.lineWidth=2;c.strokeRect(337,49,350,232);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#eff1e8';c.font='750 '+(kmh>=100?108:130)+'px system-ui,sans-serif';c.fillText(String(kmh),463,156);
  c.fillStyle=gear==='R'?'#ffbd78':'#d1e4dc';c.font='750 102px system-ui,sans-serif';c.fillText(gear,628,158);
  c.strokeStyle='#53675f';c.lineWidth=2;c.beginPath();c.moveTo(561,94);c.lineTo(561,225);c.stroke();
  for(let i=0;i<18;i++){c.fillStyle=i/18<=rpmRatio?(i<13?'#a8b9ad':i<16?'#d8bf8a':'#db7767'):'#26312d';c.fillRect(352+i*17,245,12,5);}
  carScreen.tex.needsUpdate=true;
 }

 function update({car='tavaculo',speed=0,forwardSpeed=speed,driveMode='coast',steeringAngle=0,aspect=camera.aspect,paint=null}={}){
  const isFormula=car==='f2002',now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  supercar.visible=!isFormula;formula.visible=isFormula;
  const portrait=aspect<1,compactPortrait=portrait&&aspect>.52;
  // Preserve the formula cockpit and its original portrait instrument lift.
  formula.scale.x=portrait?clamp(aspect/.80,.68,1):1;
  formulaWheel.position.y=portrait?-.34:-.44;
  // Scale the driver-facing parts equally in X/Y so the wheel stays round.
  // The wider dashboard and near-side door crop naturally on a narrow phone.
  const driverScale=portrait?clamp(aspect*.984,.31,.78):Math.min(1,aspect/2.16);
  const wheelScale=portrait?driverScale*.83:driverScale;
  carWheel.scale.set(wheelScale,wheelScale,1);
  // Landscape crops the lower wheel: expose the hub without lifting its rim.
  // The portrait wheel already shows the hub and retains its original clearance.
  wheelCenter.position.y=portrait?0:.055*clamp((aspect-1.85)/.31,0,1);
  carWheel.position.y=-.400*wheelScale-(portrait?.137:.052)+(compactPortrait?.075:0);
  driverPod.scale.set(driverScale,driverScale,1);
  driverPod.position.y=(portrait?-.318:-.305)+.305*driverScale+(compactPortrait?.08:0);
  supercar.position.x=0;supercar.scale.set(1,1,1);
  // Keep the mirror clear of the top-left race panel and right-side minimap.
  const tanHalf=Math.tan(T.MathUtils.degToRad(60)*.5),mirrorDepth=.95;
  const mirrorCX=portrait?(compactPortrait?.40:.49):.66,mirrorCY=.23,mirrorWidth=portrait?.42:.18;
  const mirrorScale=mirrorWidth*2*mirrorDepth*tanHalf*aspect/.45;
  mirrorMount.scale.setScalar(mirrorScale);
  mirrorMount.position.set((2*mirrorCX-1)*mirrorDepth*tanHalf*aspect,(1-2*mirrorCY)*mirrorDepth*tanHalf,-mirrorDepth);
  carWheel.rotation.z=clamp(steeringAngle*1.7,-.65,.65);formulaWheel.rotation.z=clamp(steeringAngle*1.5,-.55,.55);
  rollAngle=(rollAngle-forwardSpeed*dt/.285)%(Math.PI*2);
  for(const tire of formulaTires){tire.turn.rotation.y=-steeringAngle;tire.roll.rotation.x=rollAngle;}
  const bodyPaint=paint||'#d83845';
  if(bodyPaint!==lastPaint){paintMaterial.color.set(bodyPaint);lastPaint=bodyPaint;}
  const kmh=Math.round(Math.abs(speed)*3.6),reversing=forwardSpeed<-.12||(driveMode==='reverse'&&kmh<1);
  // The physics car currently has no gearbox simulation. These instruments
  // represent an automatic visual gearbox derived from measured road speed.
  const gear=reversing?'R':kmh<1?'N':String(Math.min(6,1+Math.floor(kmh/37)));
  const rpm=kmh<1?950:reversing?1200+kmh*170:1700+(kmh%37)/37*5900;
  const key=[kmh,gear,Math.round(rpm/100),driveMode,car].join('|');
  if(car!==lastCar||(now-lastInstrument>=100&&key!==lastKey)){
   drawCluster({kmh,gear,rpm,driveMode},isFormula);lastKey=key;lastInstrument=now;lastCar=car;
  }
  group.userData.telemetry={car,kmh,gear,rpm:Math.round(rpm),instrumentHz:10,gearbox:'visual-automatic',portrait};
 }
 const fill=new T.PointLight('#d8eaff',.32,5,1.8);fill.position.set(-.4,.5,-.1);group.add(fill);
 // Normalized screen rectangles are calculated only when diagnostics ask;
 // they include the real transformed vertices, including the rounded rim.
 function projectedRect(object){
  camera.updateMatrixWorld(true);object.updateWorldMatrix(true,true);
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  const point=new T.Vector3();
  object.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);const x=(point.x+1)/2,y=(1-point.y)/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}});
  return{left,top,right,bottom,width:right-left,height:bottom-top};
 }
 function stats(){
  const visible=lastCar==='f2002'?formula:supercar;let meshes=0,triangles=0;visible.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count)/3;}});
  return{activeCar:lastCar||'tavaculo',meshes,triangles,textures:textures.length,instrumentHz:10,paint:lastPaint,telemetry:{...group.userData.telemetry},projectedBounds:lastCar==='f2002'?null:{wheel:projectedRect(carWheel),instrument:projectedRect(carScreen.mesh),mirror:projectedRect(mirrorMount),mirrorSurface:projectedRect(mirrorSurface)},construction:lastCar==='f2002'?'classic-open-cockpit':'independent-classic-twin-dial-flat-pillar-cockpit',mirrorReady:!!mirrorSurface.material.map};
 }
 function dispose(){camera.remove(group);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 update();return{group,update,stats,dispose,mirrorSurface,mirrorMount};
}
