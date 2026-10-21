import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSteeringState,stepSteering,MAX_LOOK_DEGREES,MAX_WHEEL_DEGREES} from '../dist/cockpit-study-steering.mjs';

const near=(actual,expected,tolerance=1e-11)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
function hold(state,target,seconds,fps=60,follow=true){
 for(let i=0;i<Math.round(seconds*fps);i++)stepSteering(state,target,1/fps,follow);
 return state;
}

test('steering and gaze start centred and respond gently in the requested direction',()=>{
 assert.equal(MAX_LOOK_DEGREES,6);assert.equal(MAX_WHEEL_DEGREES,110);
 for(const direction of [-1,1]){
  const state=createSteeringState();assert.deepEqual(state,{amount:0,lookDegrees:0});
  assert.equal(stepSteering(state,direction,1/60),state);
  assert.ok(state.amount*direction>0&&state.amount*direction<.15);
  assert.ok(state.lookDegrees*direction>0&&state.lookDegrees*direction<.1);
  let previous={...state};
  for(let i=0;i<120;i++){
   stepSteering(state,direction,1/60);
   assert.ok(state.amount*direction>=previous.amount*direction);
   assert.ok(state.lookDegrees*direction>=previous.lookDegrees*direction);
   assert.ok(Math.abs(state.amount)<=1&&Math.abs(state.lookDegrees)<=6);
   previous={...state};
  }
  assert.ok(state.lookDegrees*direction>5.99);
 }
});

test('partial steering produces a proportional gaze and input beyond the range is bounded',()=>{
 for(const [target,expected] of [[-.35,-.35],[.6,.6],[-10,-1],[10,1]]){
  const state=createSteeringState();stepSteering(state,target,10);
  near(state.amount,expected);near(state.lookDegrees,expected*MAX_LOOK_DEGREES);
 }
});

test('releasing after a short or long hold returns monotonically without crossing centre',()=>{
 for(const direction of [-1,1])for(const duration of [.1,2]){
  const state=hold(createSteeringState(),direction,duration);let previous={...state};
  for(let i=0;i<120;i++){
   stepSteering(state,0,1/60);
   assert.ok(state.amount*direction>=0&&state.lookDegrees*direction>=0);
   assert.ok(Math.abs(state.amount)<=Math.abs(previous.amount));
   assert.ok(Math.abs(state.lookDegrees)<=Math.abs(previous.lookDegrees));
   previous={...state};
  }
  assert.ok(Math.abs(state.amount)<.00001);assert.ok(Math.abs(state.lookDegrees)<.005);
 }
});

test('reversal passes smoothly through centre and never exceeds either limit',()=>{
 const state=hold(createSteeringState(),-1,2);let crossed=false;
 for(let i=0;i<120;i++){
  const previous={...state};stepSteering(state,1,1/60);
  assert.ok(Math.abs(state.amount-previous.amount)<.27);
  assert.ok(Math.abs(state.lookDegrees-previous.lookDegrees)<.6);
  assert.ok(Math.abs(state.amount)<=1&&Math.abs(state.lookDegrees)<=6);
  if(state.lookDegrees>0)crossed=true;
 }
 assert.equal(crossed,true);assert.ok(state.lookDegrees>5.99);
});

test('turning gaze follow off leaves wheel response active and smoothly centres the gaze',()=>{
 const state=hold(createSteeringState(),1,1),wheelOnly={...state};
 stepSteering(state,-1,1/60,false);stepSteering(wheelOnly,-1,1/60,true);
 near(state.amount,wheelOnly.amount);
 assert.ok(state.lookDegrees>0&&state.lookDegrees<wheelOnly.lookDegrees);
 hold(state,-1,2,60,false);
 assert.ok(state.amount<-.999&&Math.abs(state.lookDegrees)<.005);
 hold(state,-1,2);assert.ok(state.lookDegrees<-5.99);
});

test('equal timed input sequences give matching results at 30, 60 and 120 fps',()=>{
 const sequence=[[1,.5,true],[-.5,.5,true],[0,.5,true],[-1,.5,false],[.8,.5,true]];
 const results=[30,60,120].map(fps=>{
  const state=createSteeringState(),samples=[];
  for(const [target,seconds,follow] of sequence){hold(state,target,seconds,fps,follow);samples.push({...state});}
  return samples;
 });
 for(let frameRate=1;frameRate<results.length;frameRate++)for(let i=0;i<sequence.length;i++){
  near(results[frameRate][i].amount,results[0][i].amount);
  near(results[frameRate][i].lookDegrees,results[0][i].lookDegrees);
 }
});

test('invalid time does not advance state and invalid input behaves as a release',()=>{
 const state=hold(createSteeringState(),1,.5),before={...state};
 for(const dt of [0,-1,NaN,Infinity,undefined]){stepSteering(state,-1,dt);assert.deepEqual(state,before);}
 for(const target of [NaN,Infinity,-Infinity,undefined,'left']){
  const actual={...before},expected={...before};stepSteering(actual,target,.1);stepSteering(expected,0,.1);assert.deepEqual(actual,expected);
 }
 const corrupt={amount:NaN,lookDegrees:Infinity};stepSteering(corrupt,0,.1);assert.deepEqual(corrupt,{amount:0,lookDegrees:0});
});
