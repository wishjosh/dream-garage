import * as T from './vendor/three.module.js';

export const LIFT_HEIGHT=.53;
const centerZ=-110;

export function buildTuningRoom(environment,renderer){
  const room=new T.Scene();
  room.environment=environment;
  room.environmentIntensity=.72;
  room.background=new T.Color('#18272d');
  room.fog=new T.FogExp2('#23383e',.065);
  const root=new T.Group();
  root.position.z=centerZ;
  room.add(root);
  const surface=new T.MeshStandardMaterial({color:'#314046',roughness:.72,metalness:.26});
  const disk=new T.Mesh(new T.CylinderGeometry(3.46,3.54,.18,112),surface);
  disk.position.y=.095;root.add(disk);
  const floor=new T.Mesh(new T.PlaneGeometry(86,86),new T.MeshStandardMaterial({color:'#17272c',metalness:.18,roughness:.83}));
  floor.rotation.x=-Math.PI/2;root.add(floor);
  const grid=new T.GridHelper(56,28,'#45616a','#344c55');
  grid.position.y=.008;root.add(grid);
  const ring=(radius,width,y,color)=>{
    const band=new T.Mesh(new T.RingGeometry(radius-width,radius,128),new T.MeshBasicMaterial({color,toneMapped:false}));
    band.rotation.x=-Math.PI/2;band.position.y=y;root.add(band);
  };
  ring(3.4,.019,.19,'#9ecec6');ring(3.53,.036,.018,'#4f827e');ring(2.99,.012,.19,'#677e80');
  const marks=[];
  for(let i=0;i<72;i++){
    const a=i*Math.PI/36,r=i%6===0?3.11:3.24;
    marks.push(Math.cos(a)*r,.192,Math.sin(a)*r,Math.cos(a)*3.32,.192,Math.sin(a)*3.32);
  }
  const scale=new T.BufferGeometry();
  scale.setAttribute('position',new T.Float32BufferAttribute(marks,3));
  root.add(new T.LineSegments(scale,new T.LineBasicMaterial({color:'#98b4b5'})));
  // The shadow stays on the platform, with a soft penumbra below the suspended chassis.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,10,64,64,64);
  gradient.addColorStop(0,'rgba(4,10,14,.89)');gradient.addColorStop(.54,'rgba(4,10,14,.60)');gradient.addColorStop(1,'rgba(4,10,14,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowPivot=new T.Group();root.add(shadowPivot);
  const shadow=new T.Mesh(new T.PlaneGeometry(3.55,5.9),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.196;shadowPivot.add(shadow);
  const wall=new T.Mesh(new T.CylinderGeometry(12,12,9,96,1,true),new T.ShaderMaterial({
    side:T.BackSide,
    vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 st;
    void main(){
      float wall=.11+.17*exp(-pow((st.y-.29)*3.4,2.));
      float bay=fract(st.x*20.);
      float seam=1.-smoothstep(.004,.024,min(bay,1.-bay));
      float edge=1.-smoothstep(.002,.009,abs(st.y-.105));
      float strip=(1.-smoothstep(.008,.024,abs(bay-.84)))*smoothstep(.14,.18,st.y)*(1.-smoothstep(.55,.66,st.y));
      float halo=exp(-pow((bay-.84)*6.,2.))*exp(-pow((st.y-.38)*4.,2.));
      vec3 col=vec3(.58,.76,.79)*wall+vec3(.10,.16,.17)*halo+vec3(.29,.43,.45)*strip+edge*vec3(.16,.27,.27)-seam*.038;
      gl_FragColor=vec4(col,1.);
    }`
  }));
  wall.position.y=4.48;root.add(wall);
  const sweep=new T.MeshStandardMaterial({color:'#33474a',roughness:.46,metalness:.35});
  const rim=new T.Mesh(new T.TorusGeometry(11.95,.075,6,96),sweep);
  rim.rotation.x=Math.PI/2;rim.position.y=1.0;root.add(rim);
  const diffuser=new T.MeshBasicMaterial({color:new T.Color(4.6,4.9,5.1),side:T.DoubleSide});
  const softboxes=new T.Group();root.add(softboxes);
  for(const x of [-4.4,4.4]){
    const softbox=new T.Mesh(new T.PlaneGeometry(1.12,7.8),diffuser);
    softbox.position.set(x,4.25,-.5);softbox.lookAt(0,1,0);softbox.rotateZ(Math.PI/2);softboxes.add(softbox);
  }
  const overhead=new T.Mesh(new T.PlaneGeometry(4.2,6.1),new T.MeshBasicMaterial({color:new T.Color(2.3,2.22,2.05),side:T.DoubleSide}));
  overhead.rotation.x=Math.PI/2;overhead.position.y=5.5;softboxes.add(overhead);
  room.add(new T.HemisphereLight('#f0fbfc','#62645e',1.4));
  for(const [color,power,x,y,z] of [['#fff0d7',2.8,-4,6,3],['#b0e5f3',2.45,4,3,-4]]){
    const light=new T.DirectionalLight(color,power);light.position.set(x,y,centerZ+z);
    light.target.position.set(0,.7,centerZ);room.add(light,light.target);
  }
  const setRotation=angle=>{shadowPivot.rotation.y=angle;};
  // Capture the workshop once, before the vehicle arrives, so paint and rims
  // reflect the stationary light panels from every viewing angle.
  const reflections=new T.PMREMGenerator(renderer);
  const capture=reflections.fromScene(room,0,.1,35,{size:128,position:new T.Vector3(0,1,centerZ)});
  room.environment=capture.texture;room.environmentIntensity=1.12;reflections.dispose();
  softboxes.visible=false;
  function frame(camera,width,height,rect){
    const aspect=width/height,fullHeight=Math.max(1,rect.height);
    const distance=8.85,vertical=Math.max(2.98*height/fullHeight,5.72/aspect);
    camera.up.set(0,1,0);camera.position.set(-6.34,2.65,centerZ+5.8);
    camera.lookAt(0,.94,centerZ);
    camera.fov=T.MathUtils.radToDeg(2*Math.atan(vertical/(2*distance)));
    camera.setViewOffset(width,height,width/2-(rect.left+rect.width*.5),height/2-(rect.top+rect.height*.5),width,height);
    camera.updateProjectionMatrix();
  }
  return {scene:room,setRotation,frame};
}
