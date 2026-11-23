import {RacePhysics,FIXED_DT} from '../../course-race-physics.mjs';
import {makeRacer,clamp} from '../../race-core.mjs';
import {createBodyMotion} from '../../body-motion.mjs';

export {FIXED_DT};
export const START = 18;
export const EXIT = 206;
export const ENTRY_SPEED = 90 / 3.6;

// Visual spring rates and degrees per m/s². Both cars use the game's stock driving physics.
const response = {
  tavaculo:       {pitchGain:.53, rollGain:1.12, maxPitch:4.1, maxRoll:5.4, frequency:12, damping:.84},
  'muscle-coupe': {pitchGain:.94, rollGain:2.05, maxPitch:6.7, maxRoll:8.5, frequency:5.8, damping:.54},
};
const radians = Math.PI / 180;

function spring(state,key,target,limit,tune){
  const rate = key + 'Velocity';
  const force = tune.frequency ** 2 * (target - state[key]);
  state[rate] += (force - 2 * tune.damping * tune.frequency * state[rate]) * FIXED_DT;
  state[key] = clamp(state[key] + state[rate] * FIXED_DT,-limit,limit);
  if (Math.abs(state[key]) === limit && state[key] * state[rate] > 0) state[rate] = 0;
}

export function stepPose(pose,car,{ax,ay,u}){
  const tune = response[car];
  const scale = radians * clamp(Math.abs(u) / 1.5,0,1);
  const pitch = clamp(-ax * tune.pitchGain * scale,-tune.maxPitch*radians,tune.maxPitch*radians);
  const roll = clamp(ay * tune.rollGain * scale,-tune.maxRoll*radians,tune.maxRoll*radians);
  spring(pose,'pitch',pitch,tune.maxPitch*radians,tune);
  spring(pose,'roll',roll,tune.maxRoll*radians,tune);
}

// Each sample uses exactly one game physics tick independent of display refresh rate.
export function createRun(track,car,rig){
  const racer = makeRacer(track,{car,s:START});
  const physics = new RacePhysics(track,[racer],{[car]:rig});
  const entry = physics.entries[0];
  entry.s.u = ENTRY_SPEED;
  physics.placeBody(entry);
  physics.sync(entry,false);
  const pose = createBodyMotion();

  function guide(){
    const {steer} = physics.route(entry);
    const s = racer.s, speed = entry.s.u;
    let target = ENTRY_SPEED;
    if (s >= 40 && s < 88) target = Math.sqrt(Math.max(13**2,ENTRY_SPEED**2-2*5.5*(s-40)));
    if (s >= 88 && s < 150) target = 13;
    if (s >= 150) target = Math.min(23,Math.sqrt(13**2+2*2.8*(s-150)));
    const difference = target-speed;
    return {steer,wheelCommand:true,throttle:clamp(difference*.85,0,1),brake:clamp(-difference*.7,0,1)};
  }

  function tick(input){
    physics.step(FIXED_DT,input ?? guide(),true);
    stepPose(pose,car,entry.s);
  }
  return {racer,pose,tick,dispose:()=>physics.dispose()};
}
