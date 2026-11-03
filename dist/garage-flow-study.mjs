import {normalizeSave} from './garage-core.mjs?v=circuit-main-1';
export const STUDY_KEY='dream-garage:garage-flow-study:v1';
export function freshStudySave(){return normalizeSave({version:1,coins:1000});}
export function createStudyStore(storage){
 return {read(){try{const raw=storage?.getItem(STUDY_KEY);return raw?normalizeSave(JSON.parse(raw)):freshStudySave();}catch{return freshStudySave();}},write(save){try{storage?.setItem(STUDY_KEY,JSON.stringify(save));return true;}catch{return false;}}};
}
export {categoriesFor,itemMarkup,installGarageFlow} from './garage-flow.mjs?v=garage-main-1';
