import {rankOf,PRIZES} from './race-core.mjs';
// A new settlement belongs to exactly one race. Pause/retry/return cannot award it twice.
export function createRaceSettlement(courseId){
 let settled=false;
 return {finish(save,player,racers,elapsed){
  if(settled||!player?.finished||!Number.isFinite(elapsed)||elapsed<=0)return null;
  settled=true;const rank=rankOf(player,racers),prize=PRIZES[rank-1];
  save.coins+=prize;save.races++;save.courseBest??={};save.courseBest[courseId]??={};
  const previousBest=save.courseBest[courseId][player.car],record=!Number.isFinite(previousBest)||elapsed<previousBest;
  if(record)save.courseBest[courseId][player.car]=elapsed;
  return {rank,prize,record,previousBest,elapsed};
 }};
}
