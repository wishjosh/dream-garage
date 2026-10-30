import * as T from '../../vendor/three.module.js';
import {loadFerrari,dressCar as dressFerrari,disposeDress,buildGarage} from '../ferrari-city/asset.mjs?v=ferrari-city-2';
import {loadTemplate} from '../porsche-garage/assets.mjs?v=porsche-1';
import {itemById} from './core.mjs?v=mixed-city-3';
import {preparePorscheExterior,setPorscheSteering} from './rig.mjs?v=mixed-city-3';
export {disposeDress,buildGarage};
let pending;const baseline=[];
export function loadFleet(){return pending??=Promise.all([loadFerrari(),loadTemplate('porsche',percent=>{const node=document.getElementById('welcome-status');if(node)node.textContent='포르쉐 준비 '+percent+'%';})]).then(([f,p])=>{p.root.traverse(o=>{if(o.isMesh)baseline.push({geometry:o.geometry,position:o.geometry.attributes.position,version:o.geometry.attributes.position.version});});const prepared=preparePorscheExterior(p),dimensions=new T.Box3().setFromObject(prepared.exterior).getSize(new T.Vector3()).toArray();return{...f,porsche:{...prepared,dimensions,template:p}};});}
export function geometryUnchanged(){return baseline.every(b=>b.geometry.attributes.position===b.position&&b.position.version===b.version);}
export function dressCar(root,car,loadout,rig){
 if(car==='tavaculo')return dressFerrari(root,car,loadout,rig);
 const paint=itemById(loadout.paint),rim=itemById(loadout.wheels),owned=new Map();
 root.traverse(o=>{if(!o.isMesh||o.material.name!=='study-body'&&!o.material.userData.studyRim)return;
  const source=o.material;if(!owned.has(source)){const m=source.clone();if(m.name==='study-body')m.color.set(paint?.color||'#e8e9e5');else if(rim?.color)m.color.set(rim.color);owned.set(source,m);}o.material=owned.get(source);
 });root.userData.dreamOwned={materials:[...owned.values()],geometry:[]};return root;
}
export function steerExterior(body,kind,amount,axis){if(kind==='porsche')setPorscheSteering(body,axis,amount);}
