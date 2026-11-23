import * as T from '../../vendor/three.module.js';

// Rear coordinates follow the shell: k crosses the tail, t goes from sill to deck.
// Depth is in metres towards the following camera.
export function buildMuscleRear({body,face,rubber,chrome,tail}){
  const trim = new T.MeshStandardMaterial({name:'Tail trim',color:0x424447,metalness:.68,roughness:.34,side:T.DoubleSide});
  const lens = new T.MeshPhysicalMaterial({name:'Ruby lens',color:0x760e16,roughness:.23,metalness:.13,clearcoat:.8,side:T.DoubleSide});
  // A dark red lens remains visible around the brighter brake-light prisms.
  tail.color.setHex(0x9c1120);
  tail.emissive.setHex(0xc90810);

  function point(k,t,depth){
    const xyz=face(k,t);
    xyz[2]-=depth;
    return xyz;
  }
  function skin(material,rows,closed=false){
    const columns=rows[0].length, positions=rows.flat(2), indices=[];
    for(let row=1;row<rows.length;row++){
      for(let i=0;i<(closed?columns:columns-1);i++){
        const j=(i+1)%columns, a=(row-1)*columns+i, b=(row-1)*columns+j;
        indices.push(a,a+columns,b,b,a+columns,b+columns);
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    body.add(new T.Mesh(geometry,material));
  }

  // Matched contours let the lip step back into the socket. Sample across the
  // span as well as around its ends so the lens follows the curve of the car.
  function section(k,t,width,height,radiusK,radiusT,depth){
    const bottom=[],top=[];
    function column(x,halfHeight){
      bottom.push(point(k+x,t-halfHeight,depth));
      top.push(point(k+x,t+halfHeight,depth));
    }
    const inner=width-radiusK;
    for(let i=0;i<5;i++){
      const a=i*Math.PI/10;
      column(-inner-radiusK*Math.cos(a),height-radiusT+radiusT*Math.sin(a));
    }
    for(let i=0;i<=16;i++)column(inner*(2*i/16-1),height);
    for(let i=4;i>=0;i--){
      const a=i*Math.PI/10;
      column(inner+radiusK*Math.cos(a),height-radiusT+radiusT*Math.sin(a));
    }
    return {bottom,top,loop:[...bottom,...top.slice().reverse()]};
  }
  function rim(material,outer,inner){skin(material,[outer.loop,inner.loop],true);}
  function fill(material,s){skin(material,[s.bottom,s.top]);}

  const rail = (width,height,depth)=>section(0,.643,width,height,.070,.067,depth);
  const shoulder=rail(.971,.212,.004), railEdge=rail(.957,.200,.043);
  const seal=rail(.943,.182,.049), tray=rail(.923,.165,.026);
  rim(chrome,shoulder,railEdge);
  rim(trim,railEdge,seal);
  rim(rubber,seal,tray);
  fill(rubber,tray);

  for(const side of [-1,1]){
    const k=side*.558, t=.648;
    const socket=(width,height,depth)=>section(k,t,width,height,.032,.044,depth);
    const foot=socket(.338,.157,.029), bezel=socket(.328,.148,.082);
    const mouth=socket(.307,.127,.085), recessed=socket(.291,.109,.051);
    rim(trim,foot,bezel);
    rim(rubber,bezel,mouth);
    rim(trim,mouth,recessed);
    fill(lens,recessed);
    for(const offset of [-.067,0,.067]){
      const base=section(k,t+offset,.282,.021,.022,.017,.052);
      const crown=section(k,t+offset,.277,.014,.020,.009,.060);
      rim(lens,base,crown);
      fill(tail,crown);
    }
  }

  // The plated blade has a narrow highlight at its crown and a broad top
  // shelf. Its ends turn forward to meet the quarter panels.
  const blade=[[.17,.006],[.19,.060],[.23,.109],[.27,.127],[.33,.130],[.375,.115],[.408,.075],[.421,.009]];
  skin(chrome,blade.map(([t,depth])=>Array.from({length:49},(_,i)=>{
    const k=1.035*(i/24-1), wrap=T.MathUtils.smoothstep(Math.abs(k),.86,1.035);
    return point(k,t+.023*wrap,depth-.155*wrap);
  })));
  for(const side of [-1,1]){
    const k=.66*side;
    const guard=(width,height,depth)=>section(k,.295,width,height,.018,.040,depth);
    const base=guard(.037,.153,.014), lip=guard(.032,.135,.144), pad=guard(.021,.105,.152);
    rim(chrome,base,lip);
    rim(chrome,lip,pad);
    fill(trim,pad);
  }

  // Rolled, hollow exhaust tips remain visible below the blade.
  for(const side of [-1,1]){
    const origin=point(side*.54,.045,.012);
    function pipe(profile,material){
      const geometry=new T.LatheGeometry(profile.map(([r,d])=>new T.Vector2(r,d)),24);
      const mesh=new T.Mesh(geometry,material);
      mesh.rotation.x=-Math.PI/2;
      mesh.position.fromArray(origin);
      body.add(mesh);
    }
    pipe([[.043,-.025],[.044,.039],[.045,.046],[.043,.050],[.038,.050],[.036,.046]],chrome);
    pipe([[.036,.046],[.032,.004],[0,.004]],rubber);
  }
}
