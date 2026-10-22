import * as T from './vendor/three.module.js';

// The same race scene is rendered from a rear-facing camera. Only the texture
// is mirrored: flipping a projection matrix would also reverse face culling.
// A capped offscreen pass avoids paying for a second full-resolution view.
export function createRearView({renderer,scene,camera,cockpit,surface}) {
 const target=new T.WebGLRenderTarget(384,96,{depthBuffer:true,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false});
 target.texture.colorSpace=T.SRGBColorSpace;
 target.texture.repeat.x=-1;target.texture.offset.x=1;
 surface.geometry.computeBoundingBox();
 const mirrorSize=surface.geometry.boundingBox.getSize(new T.Vector3());
 const rear=new T.PerspectiveCamera(24,mirrorSize.x/mirrorSize.y,.18,220);
 const direction=new T.Vector3(),look=new T.Vector3(),up=new T.Vector3(0,1,0);
 // A portrait HUD shares this exact rear texture. It adds two tiny meshes,
 // never a second offscreen render or a change to the physical cabin.
 const overlay=new T.Group();overlay.name='portrait-rear-view-hud';overlay.visible=false;camera.add(overlay);
 const overlayGeometry=new T.PlaneGeometry(1,1);
 const border=new T.Mesh(overlayGeometry,new T.MeshBasicMaterial({color:'#9cbbc3',depthTest:false,depthWrite:false,fog:false,toneMapped:false}));
 const display=new T.Mesh(overlayGeometry,new T.MeshBasicMaterial({map:target.texture,color:'#c8d7dd',depthTest:false,depthWrite:false,fog:false,toneMapped:false}));
 border.renderOrder=999;display.renderOrder=1000;overlay.add(border,display);
 let presentation='physical';
 function layoutOverlay(width,height){
  const distance=.2,h=2*distance*Math.tan(T.MathUtils.degToRad(camera.fov/2)),w=h*camera.aspect;
  const px=12,py=88,pw=148,ph=37;
  display.position.set(((px+pw/2)/width-.5)*w,(.5-(py+ph/2)/height)*h,-distance);
  display.scale.set(pw/width*w,ph/height*h,1);
  border.position.copy(display.position);border.scale.set((pw+4)/width*w,(ph+4)/height*h,1);
 }
 const savedViewport=new T.Vector4(),savedScissor=new T.Vector4();
 let frames=0,lastRender=-Infinity,wasActive=false,active=false,low=false,slowFrames=0,disposed=false,lastMs=0,totalMs=0,drawCalls=0,triangles=0;
 surface.material.map=target.texture;surface.material.toneMapped=false;surface.material.needsUpdate=true;
 function update({player,enabled=false,paused=false,now=performance.now(),force=false,frameMs=16,hide=[],portrait=false,viewportWidth=0,viewportHeight=0}={}) {
  if(disposed)return;
  active=!!(enabled&&player);
  overlay.visible=active&&portrait;presentation=overlay.visible?'portrait-overlay':'physical';
  if(overlay.visible)layoutOverlay(viewportWidth,viewportHeight);
  if(!active){wasActive=false;return;}
  if(!paused){slowFrames=frameMs>40?slowFrames+1:Math.max(0,slowFrames-1);if(slowFrames>=90&&!low){low=true;target.setSize(288,72);}}
  const hz=low?12:20;
  if(!force&&wasActive&&(paused||now-lastRender<1000/hz))return;
  direction.set(Math.sin(player.heading),0,Math.cos(player.heading));
  // Position at the interior mirror, above the driver's eye and toward the
  // windscreen. The player's shell is excluded, just as in the cockpit view.
  surface.updateWorldMatrix(true,false);surface.getWorldPosition(rear.position);
  rear.up.copy(up).lerp(camera.up,.3).normalize();
  look.copy(rear.position).addScaledVector(direction,-60);look.y-=.7;
  rear.lookAt(look);rear.updateMatrixWorld(true);
  const hidden=[cockpit,overlay,...hide].filter(Boolean),visibility=hidden.map(object=>object.visible);
  const oldTarget=renderer.getRenderTarget(),oldAutoClear=renderer.autoClear;
  renderer.getViewport(savedViewport);renderer.getScissor(savedScissor);const scissorTest=renderer.getScissorTest();
  const started=performance.now();
  try {
   hidden.forEach(object=>object.visible=false);
   renderer.setRenderTarget(target);renderer.setViewport(0,0,target.width,target.height);renderer.setScissorTest(false);renderer.autoClear=true;
   renderer.render(scene,rear);
   drawCalls=renderer.info.render.calls;triangles=renderer.info.render.triangles;
   frames++;lastRender=now;wasActive=true;
  } finally {
   hidden.forEach((object,i)=>object.visible=visibility[i]);
   renderer.setRenderTarget(oldTarget);renderer.setViewport(savedViewport);renderer.setScissor(savedScissor);renderer.setScissorTest(scissorTest);renderer.autoClear=oldAutoClear;
   lastMs=performance.now()-started;totalMs+=lastMs;
  }
 }
 function bounds(object=surface) {
  camera.updateMatrixWorld(true);object.updateWorldMatrix(true,false);
  const p=object.geometry.getAttribute('position'),v=new T.Vector3();let minX=1,minY=1,maxX=-1,maxY=-1;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld).project(camera);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
  return{x:(minX+1)/2,y:(1-maxY)/2,width:(maxX-minX)/2,height:(maxY-minY)/2};
 }
 function stats(){return{active,frames,width:target.width,height:target.height,hz:low?12:20,quality:low?'economy':'standard',mirrored:true,camera:rear.position.toArray(),direction:rear.getWorldDirection(new T.Vector3()).toArray(),fov:rear.fov,bounds:bounds(overlay.visible?display:surface),physicalBounds:bounds(),surfaceWorld:surface.getWorldPosition(new T.Vector3()).toArray(),presentation,drawCalls,triangles,lastCpuMs:lastMs,averageCpuMs:frames?totalMs/frames:0,disposed};}
 // Readback is only called by the opt-in QA harness, never by the game loop.
 function pixels(){
  const width=target.width,height=target.height,data=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,data);
  let hash=2166136261,changed=0,count=0,sx=0,sy=0;
  for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+1],16777619);hash=Math.imul(hash^data[i+2],16777619);if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>12)changed++;if(data[i]<65&&data[i+1]>180&&data[i+2]<100){const index=i/4;count++;sx+=index%width;sy+=Math.floor(index/width);}}
  return{hash:(hash>>>0).toString(16),width,height,nonUniform:changed>width,coverage:changed/(width*height),probe:{count,cx:count?1-(sx/count+.5)/width:null,cy:count?1-(sy/count+.5)/height:null},coordinates:'displayed mirror: x rightwards, y downwards; normalized'};
 }
 function dispose(){if(disposed)return;surface.material.map=null;surface.material.needsUpdate=true;target.dispose();overlay.removeFromParent();overlayGeometry.dispose();border.material.dispose();display.material.dispose();disposed=true;active=false;}
 return{update,stats,pixels,dispose};
}
