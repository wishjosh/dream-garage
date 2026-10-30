import {loadFleet,dressCar as dressRoadCar,steerExterior} from './studies/mixed-city/asset.mjs?v=mixed-city-3';
import {dressCar as dressOriginal,disposeDress,buildGarage} from './studies/ferrari-city/asset.mjs?v=ferrari-city-2';
export {disposeDress,buildGarage,steerExterior};
export const loadVehicles=loadFleet;
export function dressCar(root,kind,loadout,rig){return kind==='porsche'?dressRoadCar(root,kind,loadout,rig):dressOriginal(root,kind,loadout,rig);}
export function opponentCars(selected){return selected==='f2002'?['f2002','f2002','f2002']:selected==='porsche'?['tavaculo','porsche','tavaculo']:['porsche','tavaculo','porsche'];}
export function vehicleAppearance(root){let paint=null,rim=null;root?.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(!paint&&(o.name==='body'||m.name==='study-body'||m.name==='CarSurface'))paint=m.color.getHexString();if(!rim&&(o.name==='rim_fl'||m.userData.studyRim))rim=m.color.getHexString();});return{paint,rim};}
