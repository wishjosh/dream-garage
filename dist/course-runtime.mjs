import {CIRCUIT_LAYOUT} from './circuit-course.mjs';
// The only runtime choice; all environments use the same garage, awards and save flow.
export async function loadCourseRuntime(course){
 if(course.key==='marina'){
  const [{RacePhysics},{buildMarinaCity}]=await Promise.all([import('./course-race-physics.mjs?v=marina-city-1'),import('./marina-city/scene.mjs')]);
  return {description:'Marina-inspired city streets',createPhysics:(track,racers,rigs,options)=>new RacePhysics(track,racers,rigs,{...options,raceRecovery:true,finishDriveThrough:true}),buildScene:buildMarinaCity};
 }
 if(course.key==='circuit'){
  const [{RacePhysics},{buildCampus},{terrainHeight}]=await Promise.all([import('./studies/circuit-elevation/physics.mjs?v=marina-city-1'),import('./studies/circuit-elevation/scene.mjs?v=marina-city-1'),import('./studies/circuit-elevation/terrain.mjs')]);
  return {description:'terrain support + planar tyres + positioned collisions',createPhysics:(track,racers,rigs,options)=>new RacePhysics(track,racers,rigs,{...options,...CIRCUIT_LAYOUT,raceRecovery:true,finishDriveThrough:true}),buildScene:async(scene,track,{renderer,look='before'})=>{const campus=await buildCampus(scene,track,{...CIRCUIT_LAYOUT,layoutId:CIRCUIT_LAYOUT.layout,realism:true,renderer,look});return {...campus,tick(){},groundHeight:terrainHeight};}};
 }
 const [{RacePhysics},{buildCityScene}]=await Promise.all([import('./course-race-physics.mjs?v=marina-city-1'),import('./city-scene.mjs')]);
 return {description:'verified planar tyres + cannon-es collisions',createPhysics:(track,racers,rigs,options)=>new RacePhysics(track,racers,rigs,{...options,raceRecovery:true,finishDriveThrough:true}),buildScene:buildCityScene};
}
