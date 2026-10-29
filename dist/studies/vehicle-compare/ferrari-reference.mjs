import * as T from '../../vendor/three.module.js';
import {HDRLoader} from './HDRLoader.js';
export const REFERENCE={revision:'180',color:'#ff0000',exposure:.85,metalness:1,roughness:.5,clearcoat:1,clearcoatRoughness:.03};
export async function loadReferenceAssets(){
 const base=new URL('../../assets/vehicle-compare/ferrari/',import.meta.url);
 const [environment,shadow]=await Promise.all([new HDRLoader().loadAsync(new URL('venice_sunset_1k.hdr',base).href),new T.TextureLoader().loadAsync(new URL('ferrari_ao.png',base).href)]);
 environment.mapping=T.EquirectangularReflectionMapping;return{environment,shadow};
}
export function createReferencePaint(){return new T.MeshPhysicalMaterial({name:'ferrari-reference-paint',color:REFERENCE.color,metalness:1,roughness:.5,clearcoat:1,clearcoatRoughness:.03});}
export function prepareFerrari(root){
 const body=createReferencePaint();
 const details=new T.MeshStandardMaterial({name:'ferrari-reference-metal',color:'#ffffff',metalness:1,roughness:.5});
 const glass=new T.MeshPhysicalMaterial({name:'ferrari-reference-glass',color:'#ffffff',metalness:.25,roughness:0,transmission:1});
 root.getObjectByName('body').material=body;
 for(const name of ['rim_fl','rim_fr','rim_rr','rim_rl','trim'])root.getObjectByName(name).material=details;
 root.getObjectByName('glass').material=glass;return root;
}
export function addReferenceShadow(root,texture){
 const mesh=new T.Mesh(new T.PlaneGeometry(.655*4,1.3*4),new T.MeshBasicMaterial({map:texture,blending:T.MultiplyBlending,toneMapped:false,transparent:true,premultipliedAlpha:true}));
 mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;mesh.name='official-contact-shadow';mesh.userData.referenceShadow=true;root.add(mesh);return mesh;
}
export function referenceGrid(){const grid=new T.GridHelper(20,40,0xffffff,0xffffff);grid.material.opacity=.2;grid.material.depthWrite=false;grid.material.transparent=true;return grid;}