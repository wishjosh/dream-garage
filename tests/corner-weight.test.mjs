import test from 'node:test';
import assert from 'node:assert/strict';
import {raceCourse} from '../dist/race-courses.mjs';
import {createBodyMotion} from '../dist/body-motion.mjs';
import {createRun,stepPose,ENTRY_SPEED,EXIT,FIXED_DT} from '../dist/previews/corner-weight/run.mjs';

const track = raceCourse('braking').create();
const rig = (halfLength,halfWidth) => ({wheels:[],radius:.33,collision:{halfLength,halfWidth}});

test('the two automatic runs reproduce the first corner with different shell motion',()=>{
  const ferrari = createRun(track,'tavaculo',rig(2.14,.98));
  const muscle = createRun(track,'muscle-coupe',rig(2.45,1.02));
  let ferrariPitch=0, musclePitch=0, ferrariRoll=0, muscleRoll=0;
  try {
    assert.equal(ferrari.racer.speed,ENTRY_SPEED);
    for(let i=0;i<15/FIXED_DT && ferrari.racer.distance<EXIT;i++){
      ferrari.tick();muscle.tick();
      for(const key of ['x','z','heading','speed','braking']){
        assert.equal(ferrari.racer[key],muscle.racer[key],key);
      }
      ferrariPitch=Math.max(ferrariPitch,ferrari.pose.pitch);
      musclePitch=Math.max(musclePitch,muscle.pose.pitch);
      ferrariRoll=Math.max(ferrariRoll,Math.abs(ferrari.pose.roll));
      muscleRoll=Math.max(muscleRoll,Math.abs(muscle.pose.roll));
    }
    assert(ferrari.racer.distance>=EXIT);
    assert(ferrariPitch>.04 && musclePitch>ferrariPitch*1.6);
    assert(ferrariRoll>.05 && muscleRoll>ferrariRoll*1.6);
  } finally {ferrari.dispose();muscle.dispose();}
});

test('after releasing a sustained brake the coupe rebounds while the 458 settles',()=>{
  function brakeAndRelease(car){
    const pose=createBodyMotion();
    for(let i=0;i<120;i++) stepPose(pose,car,{ax:-6,ay:0,u:20});
    let rebound=0;
    for(let i=0;i<240;i++){
      stepPose(pose,car,{ax:0,ay:0,u:20});
      rebound=Math.min(rebound,pose.pitch);
    }
    assert(Math.abs(pose.pitch)<.001);
    return Math.abs(rebound);
  }
  assert(brakeAndRelease('muscle-coupe')>brakeAndRelease('tavaculo')*3);
});
