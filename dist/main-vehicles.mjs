import {loadFleet,dressCar as dressRoadCar,steerExterior} from './studies/mixed-city/asset.mjs?v=marina-city-1';
import {dressCar as dressOriginal,disposeDress,buildGarage} from './studies/ferrari-city/asset.mjs?v=marina-city-1';
export {disposeDress,buildGarage,steerExterior};
import {LINEUP,lineupIds} from './lineup-shapes.mjs';
import {loadLineupModel,dressLineup} from './lineup-models.mjs';
export async function loadVehicles(){
 const [fleet,models]=await Promise.all([loadFleet(),Promise.all(lineupIds.map(loadLineupModel))]);
 return {...fleet,...Object.fromEntries(lineupIds.map((id,i)=>[id,models[i]]))};
}
export function dressCar(root,kind,loadout,rig){if(LINEUP[kind])return dressLineup(root,loadout);return kind==='porsche'?dressRoadCar(root,kind,loadout,rig):dressOriginal(root,kind,loadout,rig);}
export function opponentCars(selected){if(LINEUP[selected])return [selected==='rally-hatch'?'muscle-coupe':'rally-hatch','tavaculo','porsche'];return selected==='f2002'?['f2002','f2002','f2002']:selected==='porsche'?['tavaculo','porsche','tavaculo']:['porsche','tavaculo','porsche'];}
export function vehicleAppearance(root){let paint=null,rim=null;root?.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(!paint&&(o.name==='body'||m.name==='study-body'||m.name==='CarSurface'||m.name==='Body finish'))paint=m.color.getHexString();if(!rim&&(o.name==='rim_fl'||m.userData.studyRim||m.name==='Wheel finish'))rim=m.color.getHexString();});return{paint,rim};}
