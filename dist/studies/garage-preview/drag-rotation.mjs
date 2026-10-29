// One captured pointer owns rotation; only the vehicle region handles gestures.
export function bindDragRotation(surface,onRotate,{enabled=()=>true,scope=surface.ownerDocument.defaultView}={}){
 let pointer=null,lastX=0,width=1;
 function stop(){
  const id=pointer;pointer=null;surface.classList.remove('dragging');
  if(id!==null&&surface.hasPointerCapture(id))surface.releasePointerCapture(id);
 }
 surface.addEventListener('pointerdown',event=>{
  if(!enabled()||pointer!==null||event.isPrimary===false||event.button!==0||event.target.closest('button,a,header'))return;
  pointer=event.pointerId;lastX=event.clientX;width=Math.max(240,surface.getBoundingClientRect().width);
  try{surface.setPointerCapture(pointer);}catch{stop();return;}
  surface.classList.add('dragging');event.preventDefault();
 });
 surface.addEventListener('pointermove',event=>{
  if(event.pointerId!==pointer)return;
  if(event.pointerType==='mouse'&&(event.buttons&1)===0){stop();return;}
  const dx=event.clientX-lastX;lastX=event.clientX;
  if(dx)onRotate(-dx*Math.PI/width);
  event.preventDefault();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(event.pointerId===pointer)stop();});
 scope.addEventListener('blur',stop);scope.addEventListener('resize',stop);
 scope.addEventListener('keydown',event=>{if(event.key==='Escape')stop();});
 surface.ownerDocument.addEventListener('visibilitychange',()=>{if(surface.ownerDocument.hidden)stop();});
 return {cancel:stop};
}
