import {test} from 'node:test';import assert from 'node:assert/strict';
import {leverCommand,steeringGrip} from '../dist/drive-console.mjs';
test('lever has an inclusive neutral zone, opposite commands and no simultaneous command',()=>{for(const n of [-.25,-.1,0,.1,.25])assert.equal(leverCommand(n),null);assert.equal(leverCommand(.26),'reverse');assert.equal(leverCommand(-.26),'drift');});
test('curved steering display preserves driving sign and symmetric return',()=>{const left=steeringGrip(1),right=steeringGrip(-1),center=steeringGrip(0);assert.ok(left.left<center.left&&right.left>center.left);assert.equal(left.top,right.top);assert.ok(left.top>center.top);assert.deepEqual(center,{left:50,top:17});assert.deepEqual(steeringGrip(3),left);});
