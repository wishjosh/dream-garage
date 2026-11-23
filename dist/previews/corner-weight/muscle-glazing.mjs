import * as T from '../../vendor/three.module.js';
import {gridLongitude} from '../../studies/coastal-motion/sky.mjs?v=coupe-glass-1';

const lerp=T.MathUtils.lerp;
const up=new T.Vector3(0,1,0);
const uv=(u,v)=>[u,v];
const across=Array.from({length:19},(_,i)=>i/9-1);

// Use the same panorama and compass as the track. Blend its reflection over
// the already rendered cabin so glazing needs no second render of the world.
function glassMaterial(name,panorama,heated=false){
  return new T.ShaderMaterial({
    name,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,
    uniforms:{panorama,longitude:{value:gridLongitude},heated:{value:heated}},
    vertexShader:`
      varying vec3 worldPoint;
      varying vec3 worldNormal;
      varying vec2 paneUv;
      void main(){
        vec4 p=modelMatrix*vec4(position,1.);
        worldPoint=p.xyz;
        worldNormal=mat3(modelMatrix)*normal;
        paneUv=uv;
        gl_Position=projectionMatrix*viewMatrix*p;
      }`,
    fragmentShader:`
      uniform sampler2D panorama;
      uniform float longitude;
      uniform bool heated;
      varying vec3 worldPoint;
      varying vec3 worldNormal;
      varying vec2 paneUv;
      void main(){
        vec3 view=normalize(cameraPosition-worldPoint);
        vec3 n=normalize(worldNormal);
        vec3 ray=reflect(-view,n);
        vec2 uv=vec2(longitude-atan(ray.x,ray.z)/6.2831853,.5+asin(clamp(ray.y,-1.,1.))/3.14159265);
        vec3 sky=texture2D(panorama,uv).rgb;
        float grazing=1.-abs(dot(n,view));
        float reflection=.095+.86*pow(clamp(grazing,0.,1.),2.15);
        if(!gl_FrontFacing) reflection*=.40;
        float tint=.18;
        float alpha=reflection+tint*(1.-reflection);
        vec3 light=sky*reflection+vec3(.025,.052,.052)*tint*(1.-reflection);
        if(heated){
          // Filter fine heater wires in screen space as the glass pitches away.
          float rows=paneUv.y*10.;
          float px=max(fwidth(rows),.001);
          float wire=clamp(.5+(.015-abs(fract(rows+.5)-.5))/px,0.,1.)*min(1.,.030/px);
          wire*=step(.05,paneUv.y)*step(paneUv.y,.95)*smoothstep(.008,.025,min(paneUv.x,1.-paneUv.x))*.72;
          light=mix(light,vec3(.13,.076,.041),wire);
          alpha=mix(alpha,1.,wire);
        }
        gl_FragColor=vec4(light/alpha,alpha);
        #include <colorspace_fragment>
      }`,
  });
}

function buildCabin(body){
  const leather=new T.MeshStandardMaterial({name:'Coupe upholstery',color:0x363332,roughness:.76});
  const trim=new T.MeshStandardMaterial({name:'Cabin lining',color:0x25292a,roughness:.89});
  const seam=new T.MeshStandardMaterial({name:'Seat welt',color:0x46413c,roughness:.72});
  function put(geometry,material,x,y,z){
    const mesh=new T.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    body.add(mesh);
    return mesh;
  }
  function box(material,x,y,z,w,h,d){
    return put(new T.BoxGeometry(w,h,d),material,x,y,z);
  }
  // A padded, tapered squab viewed from behind. The back face has rolled
  // shoulders and thickness, including when the camera looks across the cabin.
  function cushion(x,y,z,w,h,d,material,lean=0){
    const a=w/2,b=h/2,p=new T.Shape();
    p.moveTo(-a*.81,-b);
    p.quadraticCurveTo(-a,-b,-a,-b*.72);
    p.lineTo(-a*.91,b*.64);p.quadraticCurveTo(-a*.90,b,-a*.56,b);
    p.lineTo(a*.56,b);p.quadraticCurveTo(a*.90,b,a*.91,b*.64);
    p.lineTo(a,-b*.72);p.quadraticCurveTo(a,-b,a*.81,-b);p.closePath();
    const radius=Math.min(.022,h*.10,d*.27);
    const g=new T.ExtrudeGeometry(p,{depth:d,bevelThickness:radius,bevelSize:radius,bevelSegments:3,curveSegments:4});
    const mesh=put(g,material,x,y,z);
    mesh.rotation.x=lean;
    return mesh;
  }
  const parcelShelf=box(trim,0,.849,-1.38,1.47,.045,.81);
  parcelShelf.rotation.x=.085;
  cushion(0,.646,-1.01,1.35,.38,.10,leather,-.16);
  for(const x of [-.36,.36]){
    cushion(x,.770,-.12,.445,.45,.115,leather,-.13);
    for(const offset of [-.076,.076])box(seam,x+offset,1.018,-.106,.012,.065,.012);
    cushion(x,1.075,-.111,.245,.092,.094,leather,-.11);
    // The outer piping follows the rake of the backrest.
    for(const side of [-1,1]){
      const welt=box(seam,x+side*.165,.771,-.144,.006,.283,.006);
      welt.rotation.x=-.13;
    }
  }
  box(trim,0,.784,.55,1.49,.135,.32);
  for(const side of [-1,1])box(trim,side*.76,.635,-.14,.07,.28,1.86);
  const wheel=put(new T.TorusGeometry(.148,.012,8,28),trim,.35,.855,.30);
  wheel.rotation.x=-.22;
  box(trim,.35,.845,.31,.245,.026,.018);
}

export function createCoupeGlazing(){
  const panorama={value:null};
  const panes={
    rear:glassMaterial('Coupe back glass',panorama,true),
    front:glassMaterial('Coupe windshield',panorama),
  };
  function fitWindow({body,end,xs,top,paint,rubber,chrome,surface,addTube}){
    const rear=end==='rear', start=xs[0], finish=xs[xs.length-1];
    const low=lerp(start,finish,rear?.084:.046), high=lerp(start,finish,rear?.933:.956);
    const rows=[...new Set([low,high,...xs.filter(x=>x>low&&x<high),
      ...[.008,.025,.05,.95,.975,.992].map(t=>lerp(low,high,t))])].sort((a,b)=>a-b);
    function width(x){
      const t=(x-low)/(high-low), corner=Math.min(1,Math.min(t,1-t)/.07);
      return (rear?lerp(.858,.795,t):lerp(.868,.91,t))-.078*(1-Math.sqrt(Math.max(0,1-(1-corner)**2)));
    }
    function pane(k,x){
      const p=top(x,k*width(x));
      const bow=(1-k*k)*Math.sin(Math.PI*(x-low)/(high-low));
      p[1]+=.036*bow-.006;
      return p;
    }
    // Opaque painted pillars join the original roof and deck to the smaller
    // glazed aperture. No exterior photograph covers the opening on either side.
    surface(body,paint,across,[...xs.filter(x=>x<low),low],(k,x)=>top(x,k),uv,up);
    surface(body,paint,across,[high,...xs.filter(x=>x>high)],(k,x)=>top(x,k),uv,up);
    for(const side of [-1,1]){
      surface(body,paint,[0,.5,1],rows,(v,x)=>top(x,side*lerp(width(x),1,v)),uv,up);
    }
    surface(body,panes[end],across,rows,pane,(k,x)=>[(k+1)/2,(x-low)/(high-low)],up);
    const edges=[...[-1,1].map(k=>rows.map(x=>pane(k,x))),...[low,high].map(x=>across.map(k=>pane(k,x)))];
    for(const edge of edges){
      addTube(body,rubber,edge,.013);
      addTube(body,chrome,edge.map(([x,y,z])=>[x,y+.010,z]),.004);
    }
    if(rear)buildCabin(body);
  }
  return {panorama,fitWindow};
}
