import * as T from '../../vendor/three.module.js';

const newAsset=file=>new URL(file,import.meta.url).href;
export async function buildPit(scene){
  const plate=await new T.TextureLoader().loadAsync(newAsset('service-bay.webp'));
  plate.colorSpace=T.SRGBColorSpace;
  scene.background=plate;scene.fog=null;scene.environmentIntensity=.82;
  scene.add(new T.HemisphereLight('#ffedda','#767675',1.08));
  const door=new T.DirectionalLight('#ffca94',1.85);
  door.position.set(4.3,3.4,4.7);scene.add(door);
  const fill=new T.DirectionalLight('#c5ddd9',.68);fill.position.set(-4.5,2,1.2);scene.add(fill);
  const group=new T.Group();group.name='Coastal pit 07';group.userData.sign=new T.Object3D();
  group.userData.art={id:'coastal-service-bay',floorY:.24};scene.add(group);
  return group;
}
export function parkCar(car,shadow){
  const ao=new T.Mesh(new T.PlaneGeometry(2.77,5.35),new T.MeshBasicMaterial({
    map:shadow,blending:T.MultiplyBlending,transparent:true,toneMapped:false,depthWrite:false,
    premultipliedAlpha:true,polygonOffset:true,polygonOffsetFactor:-1,
  }));
  ao.rotation.x=-Math.PI/2;ao.position.y=.005;ao.renderOrder=1;
  car.add(ao);car.userData.dreamOwned.materials.push(ao.material);car.userData.dreamOwned.geometry.push(ao.geometry);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),fade=ctx.createRadialGradient(64,64,6,64,64,63);
  fade.addColorStop(0,'rgba(29,22,18,.95)');fade.addColorStop(.48,'rgba(29,22,18,.66)');fade.addColorStop(1,'rgba(29,22,18,0)');
  ctx.fillStyle=fade;ctx.fillRect(0,0,128,128);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const m=new T.MeshBasicMaterial({map,transparent:true,toneMapped:false,depthWrite:false});
  const plane=new T.PlaneGeometry(1,1);car.userData.dreamOwned.materials.push(m);car.userData.dreamOwned.geometry.push(plane);
  m.addEventListener('dispose',()=>map.dispose());
  const contact=(x,z,w,l,sort)=>{
    const sm=new T.Mesh(plane,m);sm.rotation.x=-Math.PI/2;sm.scale.set(w,l,1);sm.position.set(x,.008,z);sm.renderOrder=sort;car.add(sm);
  };
  contact(-.12,-.22,3.25,5.24,2);
  for(const id of ['fl','fr','rl','rr']){
    const wheel=car.getObjectByName('wheel_'+id);
    if(wheel)contact(wheel.position.x,wheel.position.z,.57,.75,3);
  }
}
export function framePit(camera,plate,width,height){
  const aspect=width/height,reference=plate.image.width/plate.image.height,tall=aspect<1;
  const cropX=Math.min(1,aspect/reference),cropY=Math.min(1,reference/aspect);
  plate.repeat.set(cropX,cropY);plate.offset.set((1-cropX)*(tall?.48:.5),(1-cropY)*.45);
  camera.up.set(0,1,0);camera.position.set(-4.98,1.67,-105.7);
  camera.lookAt(0,.86,-110);camera.fov=T.MathUtils.radToDeg(2*Math.atan((tall?.44:.53)/aspect));
  const targetX=tall?.50:.44,targetY=tall?.55:.524;
  camera.setViewOffset(width,height,width*(.5-targetX),height*(.5-targetY),width,height);camera.updateProjectionMatrix();
}
export function installPitUI(){
  document.body.classList.add('coastal-review');
  const css=document.createElement('link');css.rel='stylesheet';css.href=newAsset('pit.css?v=pit-lab-1');document.head.append(css);
  const byId=id=>document.getElementById(id);
  byId('pause-course-name').after(byId('resume'),byId('back-menu'));
}
