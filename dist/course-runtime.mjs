import {CIRCUIT_LAYOUT} from './circuit-course.mjs';
// The only runtime choice; both environments use the same garage, awards and save flow.
export async function loadCourseRuntime(course){
 if(course.key==='circuit'){
  const [{RacePhysics},{buildCampus},{terrainHeight}]=await Promise.all([import('./studies/circuit-elevation/physics.mjs?v=distance-extension-1'),import('./studies/circuit-elevation/scene.mjs?v=distance-extension-1'),import('./studies/circuit-elevation/terrain.mjs')]);
  return {description:'terrain support + planar tyres + positioned collisions',createPhysics:(track,racers,rigs,options)=>new RacePhysics(track,racers,rigs,{...options,...CIRCUIT_LAYOUT}),buildScene:async(scene,track,{renderer})=>{const campus=await buildCampus(scene,track,{...CIRCUIT_LAYOUT,layoutId:CIRCUIT_LAYOUT.layout,realism:true,renderer});return {...campus,tick(){},groundHeight:terrainHeight};}};
 }
 const [{RacePhysics},{buildCityScene}]=await Promise.all([import('./course-race-physics.mjs'),import('./city-scene.mjs')]);
 return {description:'verified planar tyres + cannon-es collisions',createPhysics:(track,racers,rigs,options)=>new RacePhysics(track,racers,rigs,options),buildScene:buildCityScene};
}
