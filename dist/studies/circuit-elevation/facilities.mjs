import {STAND} from './spectators.mjs';
import {campusFacilities} from './layout.mjs';
// Boxes use the preserved campus [along-track, negative world-x] coordinates.
export const FACILITY_BUILDINGS=Object.freeze([
 {id:'paddock-a',zone:'paddock',name:'PADDOCK / A',kind:'workshop',box:[286,-144,334,-126],height:4.8,bays:6,doorWidth:5,doorHeight:3.2},
 {id:'paddock-b',zone:'paddock',name:'PADDOCK / B',kind:'workshop',box:[366,-144,414,-126],height:4.8,bays:6,doorWidth:5,doorHeight:3.2},
 {id:'operations-office',zone:'medical',name:'OPERATIONS',kind:'office',box:[714,-154,738,-140],height:3.8},
 {id:'recovery-garage',zone:'medical',name:'RECOVERY',kind:'workshop',box:[752,-160,776,-140],height:5.2,bays:3,doorWidth:4.8,doorHeight:4}
]);
export const FACILITY_YARDS=Object.freeze([
 {id:'paddock',box:[250,-190,520,-110]},
 {id:'medical',box:[700,-190,800,-120]}
]);
export const FACILITY_ACCESS=Object.freeze([{id:'medical-access',box:[630,-184,700,-176],points:[[630,-180],[700,-180]],halfWidth:4}]);
export function facilityVariant(id='split'){if(!['before','split'].includes(id))throw Error('Unknown facility layout: '+id);return id;}
export function facilityColliders(layout,variant='before',spectators='before'){
 const original=campusFacilities(layout).filter(f=>['pit','paddock','medical','stand'].includes(f.id)).map(f=>({...f,height:4}));
 const buildings=variant==='split'?[...original.filter(f=>!['paddock','medical'].includes(f.id)),...FACILITY_BUILDINGS]:original;
 return spectators==='scaled'?buildings.map(f=>f.id==='stand'?{...f,box:STAND.box,height:STAND.roofHeight+.11}:f):buildings;
}
export function withinYard(x,along,variant){return variant==='split'&&[...FACILITY_YARDS,...FACILITY_ACCESS].some(({box:[a,b,c,d]})=>along>=a&&along<=c&&x>=-d&&x<=-b);}
export function facilityStats(variant){return {variant,buildings:variant==='split'?FACILITY_BUILDINGS.map(f=>({id:f.id,zone:f.zone,box:f.box,length:f.box[2]-f.box[0],depth:f.box[3]-f.box[1],height:f.height,bays:f.bays||0,doorWidth:f.doorWidth||null,doorHeight:f.doorHeight||null})):[],yards:variant==='split'?FACILITY_YARDS:[],access:variant==='split'?FACILITY_ACCESS:[]};}
