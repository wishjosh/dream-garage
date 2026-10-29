import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDragRotation} from '../dist/studies/garage-preview/drag-rotation.mjs';
function fixture(width=400){
 const surface=new EventTarget(),scope=new EventTarget(),doc=new EventTarget(),classes=new Set(),captured=new Set();let angle=0,enabled=true;
 surface.ownerDocument=doc;surface.classList={add:n=>classes.add(n),remove:n=>classes.delete(n)};surface.getBoundingClientRect=()=>({width});
 surface.setPointerCapture=id=>captured.add(id);surface.hasPointerCapture=id=>captured.has(id);surface.releasePointerCapture=id=>captured.delete(id);
 const binding=bindDragRotation(surface,delta=>angle+=delta,{scope,enabled:()=>enabled});
 function send(type,{id=1,x=100,pointerType='touch',button=0,buttons=1,isPrimary=true,control=false}={}){
  const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,clientX:x,pointerType,button,buttons,isPrimary});
  Object.defineProperty(event,'target',{value:{closest:()=>control?{}:null}});surface.dispatchEvent(event);return event;
 }
 return {surface,scope,doc,classes,captured,send,binding,get angle(){return angle},disable(){enabled=false}};
}
test('touch and mouse move the same fraction of a turn and stop on release',()=>{
 for(const pointerType of ['touch','mouse']){
  const f=fixture();f.send('pointerdown',{pointerType});assert.equal(f.angle,0);
  f.send('pointermove',{pointerType,x:200});assert.equal(f.angle,-Math.PI/4);
  f.send('pointermove',{pointerType,x:100});assert.equal(f.angle,0);
  f.send('pointerup',{pointerType});f.send('pointermove',{pointerType,x:300});
  assert.equal(f.angle,0);assert.equal(f.captured.size,0);assert.equal(f.classes.size,0);
 }
 const f=fixture(800);f.send('pointerdown');f.send('pointermove',{x:300});assert.equal(f.angle,-Math.PI/4);
});
test('second fingers, controls, right clicks and unloaded vehicles cannot start or steal rotation',()=>{
 const f=fixture();
 for(const opt of [{control:true},{button:2},{isPrimary:false}]){f.send('pointerdown',opt);f.send('pointermove',{x:300});assert.equal(f.angle,0);}
 f.send('pointerdown');f.send('pointerdown',{id:2,x:500});f.send('pointermove',{id:2,x:600});f.send('pointerup',{id:2});
 assert.equal(f.angle,0);f.send('pointermove',{x:200});assert.equal(f.angle,-Math.PI/4);
 f.binding.cancel();f.disable();f.send('pointerdown');f.send('pointermove',{x:300});assert.equal(f.angle,-Math.PI/4);
});
test('cancel, lost capture, blur, resize, hidden page and lost mouse button never leave dragging active',()=>{
 for(const reason of ['pointercancel','lostpointercapture','blur','resize','hidden','mouse-release','escape']){
  const f=fixture();f.send('pointerdown');f.send('pointermove',{x:200});const before=f.angle;
  if(reason==='hidden'){f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));}
  else if(reason==='mouse-release')f.send('pointermove',{pointerType:'mouse',buttons:0,x:300});
  else if(reason==='escape'){const e=new Event('keydown');e.key='Escape';f.scope.dispatchEvent(e);}
  else if(['blur','resize'].includes(reason))f.scope.dispatchEvent(new Event(reason));
  else f.send(reason);
  f.send('pointermove',{x:400});assert.equal(f.angle,before,reason);assert.equal(f.captured.size,0,reason);assert.equal(f.classes.size,0,reason);
 }
});
