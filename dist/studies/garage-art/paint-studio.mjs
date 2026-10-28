import * as T from '../../vendor/three.module.js';
// Reflection cards are generated geometry, never external image textures.
export function createPaintStudio(renderer){
 const studio=new T.Scene();studio.background=new T.Color('#5e6369');
 const geo=new T.BoxGeometry(1,1,1),materials=[];
 function card(x,y,z,w,h,brightness){const mat=new T.MeshBasicMaterial({color:new T.Color('#ffffff').multiplyScalar(brightness)});materials.push(mat);const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,.04);mesh.lookAt(0,.7,0);studio.add(mesh);}
 card(-4,3,-2,5,.75,2.8);card(4,2.4,1,4,.55,2.0);card(0,5,0,2,3,1.5);
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromScene(studio,.025,.1,100);pmrem.dispose();geo.dispose();materials.forEach(m=>m.dispose());
 return{texture:target.texture,dispose:()=>target.dispose()};
}
