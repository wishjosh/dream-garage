import * as T from './vendor/three.module.js';

// The study deliberately has no procedural fallback: it must show the inspected
// source interior or a visible missing-asset state, never a look-alike substitute.
export async function loadStudyCar(loader) {
  const manifestUrl=new URL('./assets/cockpit-study/gallardo/manifest.json',import.meta.url);
  const response=await fetch(manifestUrl);
  if(response.status===404){const error=new Error('Gallardo 원본 파일을 기다리고 있습니다. 원본을 확보한 뒤 실내 모델을 연결합니다.');error.code='ASSET_PENDING';throw error;}
  if(!response.ok) throw new Error('모델 준비 정보를 불러오지 못했습니다. HTTP '+response.status);
  const m=await response.json();
  if(m.schema!==1||m.sourceInspected!==true||!m.asset||!m.provenance?.source||!m.provenance?.license) throw new Error('검토한 모델의 출처·변환 정보가 필요합니다.');
  const vector=(value,name)=>{
    if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite)) throw new Error(name+' 좌표가 올바르지 않습니다.');
    return new T.Vector3(...value);
  };
  const eye=vector(m.eye,'눈 위치'),forward=vector(m.forward,'전방');
  if(forward.distanceTo(new T.Vector3(0,0,-1))>1e-6) throw new Error('실내 모델을 +Y 위·-Z 전방으로 변환한 뒤 연결해 주세요.');
  const assetUrl=new URL(m.asset,manifestUrl),assetFolder=new URL('./',manifestUrl);
  if(typeof m.asset!=='string'||m.asset.startsWith('/')||assetUrl.origin!==manifestUrl.origin||!assetUrl.pathname.startsWith(assetFolder.pathname)||!assetUrl.pathname.endsWith('.glb')||assetUrl.search||assetUrl.hash) throw new Error('모델 파일은 검토 폴더 안의 GLB여야 합니다.');
  const gltf=await loader.loadAsync(assetUrl.href);
  const root=gltf.scene;
  root.name='inspected-gallardo-interior';
  root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());
  if(bounds.isEmpty()||Math.min(size.x,size.y,size.z)<=0) throw new Error('원본 모델의 공간 범위를 확인하지 못했습니다.');
  let meshes=0,triangles=0;
  root.traverse(object=>{
    if(!object.isMesh) return;
    meshes++;
    const g=object.geometry;triangles+=(g.index?.count??g.attributes.position?.count??0)/3;
  });
  // Circle is the source wheel alone. Circle.004 (column cover) and .005
  // (stalks) stay fixed. Source origin and its 21-degree column axis were
  // mapped through the same uniform source-to-glTF transform as the mesh.
  const wheel=root.getObjectByName('source_Circle');
  if(!wheel)throw new Error('원본 핸들 부품을 찾을 수 없습니다.');
  const steeringPivot=new T.Group();steeringPivot.name='study-steering-pivot';
  steeringPivot.position.set(-0.3995926288,0.7638591121,-0.4459867420);
  root.add(steeringPivot);root.updateMatrixWorld(true);steeringPivot.attach(wheel);
  const steeringAxis=new T.Vector3(0,0.3583680987,0.9335803986).normalize();
  const expectedRotation=new T.Quaternion();
  const setSteeringAngle=radians=>{
    // Input convention: negative left, positive right. The driver-facing
    // axis has a positive counterclockwise (left) rotation.
    expectedRotation.setFromAxisAngle(steeringAxis,-radians);
    steeringPivot.quaternion.copy(expectedRotation);
  };
  const steeringRotationValid=()=>steeringPivot.quaternion.angleTo(expectedRotation)<1e-7;
  // Meter scale, orientation and part proportions are baked by the source
  // conversion. Do not normalize individual components or resize for aspect.
  return {root,eye,forward,steeringPivot,setSteeringAngle,steeringRotationValid,
    mirrorSurface:m.mirrorNode?root.getObjectByName(m.mirrorNode):null,
    stats:{meshes,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},sourceSha256:m.sourceSha256},
    provenance:m.provenance};
}
