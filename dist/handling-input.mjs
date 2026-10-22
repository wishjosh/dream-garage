import {clamp} from './handling-physics.mjs';
export function createControls(mode='buttons'){return{mode,value:0,target:0,held:new Map(),sliderId:null,keys:new Set()};}
export function clearControls(c){c.value=0;c.target=0;c.held.clear();c.keys.clear();c.sliderId=null;}
export function setControlMode(c,mode){clearControls(c);c.mode=mode==='slide'?'slide':'buttons';}
export function slideValue(clientX,left,width){return clamp((left+width/2-clientX)/(width*.40),-1,1);}
export function pressControl(c,id,action,value=0){
  if(action==='slide'){if(c.sliderId!==null)return false;c.sliderId=id;c.target=clamp(value,-1,1);}
  c.held.set(id,action);return true;
}
export function moveSlide(c,id,value){if(c.sliderId===id)c.target=clamp(value,-1,1);}
export function releaseControl(c,id){if(c.sliderId===id){c.sliderId=null;c.target=0;}c.held.delete(id);}
export function readControls(c,dt){
  const down=action=>[...c.held.values()].includes(action);
  const left=down('left')||c.keys.has('ArrowLeft')||c.keys.has('KeyA');
  const right=down('right')||c.keys.has('ArrowRight')||c.keys.has('KeyD');
  const keySteer=(left?1:0)-(right?1:0);
  const target=(c.mode==='buttons'||left||right)?keySteer:c.target;
  // Buttons grow into a turn; the thumb slider holds any chosen angle.
  const rate=c.mode==='buttons'?(target===0?2.4:1.55):7;
  c.value+=clamp(target-c.value,-rate*dt,rate*dt);
  return{steer:c.value,throttle:Number(down('gas')||down('reverse')||c.keys.has('KeyX')||c.keys.has('ArrowUp')||c.keys.has('KeyW')),
    brake:Number(down('brake')||c.keys.has('ArrowDown')||c.keys.has('Space')),reverse:down('reverse')||c.keys.has('KeyX')};
}
