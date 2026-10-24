import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {setCabinUp} from '../dist/cockpit-attitude.mjs';
function view(roll,follow,heading=0,pitch=0,gaze=0){
 const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading).multiply(new T.Quaternion().setFromEuler(new T.Euler(pitch,0,roll)));
 const up=new T.Vector3(0,1,0),c=new T.PerspectiveCamera(42.386,844/390,.035,700);
 if(follow===null)setCabinUp(c.up,q,up);else c.up.copy(up).applyQuaternion(q).lerp(up,1-follow);
 c.lookAt(new T.Vector3(Math.sin(gaze),-.07,Math.cos(gaze)).applyQuaternion(q));c.updateMatrixWorld(true);
 const left=new T.Vector3(.5,0,2).applyQuaternion(q).project(c),right=new T.Vector3(-.5,0,2).applyQuaternion(q).project(c);
 const yaw=new T.Quaternion().setFromAxisAngle(up,heading);
 const outsideLeft=new T.Vector3(5,0,50).applyQuaternion(yaw).project(c),outsideRight=new T.Vector3(-5,0,50).applyQuaternion(yaw).project(c);
 return {cabin:right.y-left.y,horizon:outsideRight.y-outsideLeft.y,up:c.up};
}
test('cabin stays steadier while horizon keeps the correct turn direction',()=>{
 for(const sign of [-1,1])for(const heading of [0,.8,Math.PI])for(const pitch of [-.035,0,.035])for(const gaze of [-.1,0,.1]){
 const a=view(sign*.08,.45,heading,pitch,gaze),b=view(sign*.08,null,heading,pitch,gaze);
 assert.ok(b.horizon*sign>0);assert.ok(b.cabin*sign<0);
 assert.ok(Math.abs(b.cabin)<Math.abs(a.cabin)*.4,'cabin counter-motion should be substantially smaller');
 assert.ok(Math.abs(b.up.length()-1)<1e-10);
 }
});
test('no body roll leaves the horizon level and helper does not change body pose',()=>{
 const q=new T.Quaternion(),before=q.toArray();setCabinUp(new T.Vector3(),q,new T.Vector3(0,1,0));
 assert.deepEqual(q.toArray(),before);assert.ok(Math.abs(view(0,null).horizon)<1e-12);
});

