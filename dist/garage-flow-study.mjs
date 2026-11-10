import {normalizeSave} from './garage-core.mjs?v=marina-city-1';
export const STUDY_KEY='dream-garage:garage-flow-study:v1';
export function freshStudySave(){return normalizeSave({version:1,coins:1000});}
export const ART_STUDY_KEY='dream-garage:garage-art-study:v1';
export function createStudyStore(storage,key=STUDY_KEY){
 return {read(){try{const raw=storage?.getItem(key);return raw?normalizeSave(JSON.parse(raw)):freshStudySave();}catch{return freshStudySave();}},write(save){try{storage?.setItem(key,JSON.stringify(save));return true;}catch{return false;}}};
}
export {categoriesFor,itemMarkup,installGarageFlow} from './garage-flow.mjs?v=marina-city-1';
