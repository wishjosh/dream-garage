import {CARS,itemById,transact} from './garage-core.mjs?v=porsche-main-1';
export function createPreviewSession({categories=['paint','wheels']}={}){
 let pending=null;
 return {
  get pending(){return pending?{...pending}:null;},
  cancel(){pending=null;},
  begin(save,car,id){const item=itemById(id);if(!CARS.includes(car)||!item||!categories.includes(item.category))return {ok:false,reason:'invalid'};pending=save.garage[car][item.category]===id?null:{car,id};return {ok:true};},
  loadout(save,car){const result={...save.garage[car]};if(pending?.car===car){const item=itemById(pending.id);result[item.category]=item.id;}return result;},
  quote(save){if(!pending)return null;const item=itemById(pending.id),owned=save.owned.includes(item.id),cost=owned?0:item.price;return{...pending,item,owned,cost,balance:save.coins,after:save.coins-cost,affordable:save.coins>=cost};},
  confirm(save,car){if(!pending||pending.car!==car)return {ok:false,reason:'no-preview'};const chosen={...pending},result=transact(save,car,chosen.id);if(result.ok)pending=null;return {...result,car,id:chosen.id};}
 };
}
