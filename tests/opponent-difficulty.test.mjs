import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RacePhysics} from '../dist/course-race-physics.mjs';
import {raceCourse} from '../dist/race-courses.mjs';
import {makeRacer,trackFrame} from '../dist/race-core.mjs';
import {LEVELS} from '../dist/opponent-difficulty.mjs';

test('the three difficulty settings change the driver at turn one and preserve player handling',()=>{
  const track=raceCourse('braking').create();
  const rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
  const outputs=[];
  for(const difficulty of Object.keys(LEVELS)){
    const racers=[makeRacer(track),makeRacer(track,{id:'rival',s:7})];
    const race=new RacePhysics(track,racers,rigs,{difficulty});
    const frame=trackFrame(track,115);
    const driver=e=>{
      Object.assign(e.s,{x:frame.x,z:frame.z,heading:Math.atan2(frame.tx,frame.tz),u:19});
      return race.route(e);
    };
    outputs.push({player:driver(race.entries[0]),bot:driver(race.entries[1]),physical:race.entries.map(e=>({...e.config}))});
    race.dispose();
  }
  const [rookie,club,pro]=outputs;
  for(const result of [club,pro]){
    assert.deepEqual(result.player,rookie.player);
    assert.deepEqual(result.physical,rookie.physical);
  }
  assert(rookie.bot.brake>club.bot.brake);
  assert(pro.bot.throttle>club.bot.throttle);
});
