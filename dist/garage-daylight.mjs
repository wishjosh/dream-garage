import * as T from './vendor/three.module.js';
import {daylightEnvironment} from './studies/circuit-elevation/daylight.mjs?v=garage-art-1';
import {prepareCircuitArt} from './studies/circuit-elevation/art.mjs?v=garage-art-1';

// A working pit bay at vehicle scale. Shared scans and HDR stay resident for both scenes.
export async function buildDaylightGarage(scene,renderer){
 const [art,{environment,direction}]=await Promise.all([prepareCircuitArt(),daylightEnvironment()]);
 scene.environment=environment;scene.background=environment;scene.environmentIntensity=.65;scene.backgroundIntensity=.8;scene.fog=new T.Fog('#bcc9cf',80,240);
 const garage=new T.Group();garage.name='daylight-pit-garage';garage.position.z=-110;scene.add(garage);
 const cube=new T.BoxGeometry(),steel=new T.MeshStandardMaterial({color:'#5f6465',metalness:.65,roughness:.46}),charcoal=new T.MeshStandardMaterial({color:'#343b3d',roughness:.7}),cream=new T.MeshStandardMaterial({color:'#dedbd1',roughness:.8}),yellow=new T.MeshStandardMaterial({color:'#be9c52',roughness:.85});
 const concrete=art.concrete.clone();concrete.onBeforeCompile=art.concrete.onBeforeCompile;concrete.customProgramCacheKey=art.concrete.customProgramCacheKey;concrete.color.set('#d1cec5');concrete.normalScale.set(.18,.18);
 const floor=new T.MeshStandardMaterial({color:'#a9a79f',roughness:.84,roughnessMap:art.road.roughnessMap,normalMap:art.road.normalMap,normalScale:new T.Vector2(.035,.035)});
 function box(w,h,d,x,y,z,material,shadow=true){const m=new T.Mesh(cube,material);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;garage.add(m);return m;}
 // Floor height matches the existing preview datum, without resizing or raising the car.
 box(14,.24,16,0,.12,-2,floor);box(13,.16,5,0,.08,-12,new T.MeshStandardMaterial({...art.road,color:'#a7a9a8',roughness:1}));
 box(1,4.8,.25,-6,2.64,5,concrete);box(4.5,4.8,.25,4.25,2.64,5,concrete);box(13,.6,.25,0,4.74,5,concrete);box(.25,4.8,14,-6.5,2.64,-2,concrete);
 box(4.5,.6,.18,4.25,.54,4.82,charcoal);box(.18,.6,14,-6.32,.54,-2,charcoal);
 box(13,.16,14,0,5.12,-2,cream);
 // Roof structure and a raised roller shutter, clear of the car and camera.
 for(const x of [-6.2,6.2]){box(.14,4.8,.18,x,2.64,-5.8,steel);box(.14,.24,10.7,x,4.95,-.5,steel);}
 for(const z of [-5.8,-.5,4.6])box(12.5,.2,.12,0,4.95,z,steel);
 box(12.4,.46,.42,0,4.82,-5.85,cream);
 for(let i=0;i<5;i++)box(12.3,.025,.025,0,4.63+i*.085,-6.07,steel);
 // One open side looks onto the pit apron; the opposite wall carries a workbench.
 box(3.5,.08,.82,4.15,1.15,4.25,steel);box(3.2,.83,.7,4.15,.69,4.25,charcoal);
 for(let i=0;i<4;i++)box(.65,.025,.04,2.97+i*.78,.82,3.88,steel);
 box(2.8,.88,.06,4.15,1.92,4.81,charcoal);
 for(let i=0;i<6;i++){box(.025,.25,.025,3.05+i*.43,1.93,4.75,steel);box(.09,.04,.035,3.05+i*.43,2.07,4.73,steel);}
 box(.65,1.05,1.1,-5.95,.78,.5,charcoal);for(let i=0;i<4;i++)box(.03,.03,.9,-5.6,.52+i*.22,.5,steel);
 for(const x of [-2.15,2.15]){box(.055,.006,6.8,x,.244,-.3,yellow,false);for(const z of [-3.7,3.1])box(.5,.006,.055,x+Math.sign(x)*.22,.244,z,yellow,false);}
 // Small floor joints and drain add scale without competing with paint selection.
 for(const x of [-4,0,4])box(.012,.002,15.8,x,.241,-2,charcoal,false);
 box(12,.012,.18,0,.246,-6.2,steel,false);for(let i=0;i<50;i++)box(.08,.014,.14,-5.88+i*.24,.248,-6.2,charcoal,false);
 const tyre=art.tyre.clone(true);tyre.rotation.x=Math.PI/2;tyre.updateMatrixWorld(true);const b=new T.Box3().setFromObject(tyre),center=b.getCenter(new T.Vector3());tyre.position.set(-5.55-center.x,.24-b.min.y,2.8-center.z);garage.add(tyre);
 const stripe=new T.MeshStandardMaterial({color:'#afa99b',roughness:.9});box(4.5,.12,.03,4.25,2.85,4.85,stripe);
 box(16,.18,14,0,.09,12,new T.MeshStandardMaterial({...art.road,color:'#a7a9a8',roughness:1}));
 for(let i=0;i<5;i++){const barrier=art.barrier.clone(true);barrier.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(barrier),size=bounds.getSize(new T.Vector3()),c=bounds.getCenter(new T.Vector3()),scale=2.8/size.x;barrier.scale.multiplyScalar(scale);barrier.position.set(-5.6+i*2.8-c.x*scale,-bounds.min.y*scale,20-c.z*scale);barrier.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});garage.add(barrier);}
 const sign=new T.Group();garage.add(sign);garage.userData.sign=sign;
 // The same sky illuminates the car indoors, with a restrained cool bounce under the roof.
 scene.add(new T.HemisphereLight('#dce7ef','#706a55',.55));
 const sun=new T.DirectionalLight('#fff4e5',2);sun.target.position.set(0,.24,-110);sun.position.copy(sun.target.position).addScaledVector(direction,24);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:1,far:60});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
 // A broad bay opening supplies a soft fill; the floor still receives the car's contact shadow.
 const fill=new T.DirectionalLight('#e7eef1',.6);fill.position.set(5,4,-119);fill.target.position.set(0,.5,-110);scene.add(fill,fill.target);
 const outside=new T.Mesh(new T.PlaneGeometry(280,280),new T.MeshStandardMaterial({...art.ground,color:'#aaa68c',roughness:1}));outside.rotation.x=-Math.PI/2;outside.position.set(0,-.02,-110);outside.receiveShadow=true;scene.add(outside);
 renderer.shadowMap.needsUpdate=true;
 garage.userData.art={id:'daylight',environment:'Kloofendal 48d Partly Cloudy',bay:[13,4.8,14],floorY:.24,sharedEnvironment:true};return garage;
}
