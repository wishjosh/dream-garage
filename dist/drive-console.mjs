const clamp=v=>Math.max(-1,Math.min(1,v));
export function leverCommand(value){return value>.25?'reverse':value<-.25?'drift':null;}
// Only the display follows the curved rail. Driving still uses the same 72px input.
export function steeringGrip(value){const n=clamp(-value);return{left:50+37*n,top:17+66*(n*.82)**2};}
export function installDriveConsole({canDrive,onPointer}){
 const root=document.getElementById('drive-console'),lever=document.getElementById('drive-lever'),grip=lever.querySelector('.lever-knob');
 const boxes={steer:[38,593,1030,791],brake:[1069,571,1411,787],gas:[1451,388,1600,787],rail:[1650,324,1721,799],grip:[1175,120,1441,242]};
 const file=new URL('./assets/ui/graphite-console.png',import.meta.url).href;
 document.querySelectorAll('[data-console-art]').forEach(el=>{const b=boxes[el.dataset.consoleArt],w=b[2]-b[0],h=b[3]-b[1],im=new Image();im.src=file;im.alt='';im.draggable=false;el.style.aspectRatio=w+'/'+h;Object.assign(im.style,{width:1774/w*100+'%',left:-b[0]/w*100+'%',top:-b[1]/h*100+'%'});if(['gas','brake'].includes(el.dataset.consoleArt))im.style.height=887/h*100+'%';el.append(im);});
 const pointers=new Map();let owner=null,value=0,keyHeld=false;
 const paintLever=()=>{grip.style.top=(50-value*32)+'%';const command=leverCommand(value);lever.dataset.command=command||'neutral';lever.setAttribute('aria-valuenow',String(Math.round(value*100)));lever.setAttribute('aria-valuetext',command==='reverse'?'위 · 후진 요청':command==='drift'?'아래 · 드리프트와 가속':'중앙 · 대기');};
 function release(id){const p=pointers.get(id);if(!p)return;pointers.delete(id);if(owner===id){owner=null;value=0;lever.classList.remove('pressed');paintLever();}onPointer(id,null,false);if(p.capture.hasPointerCapture?.(id))p.capture.releasePointerCapture(id);}
 function clear(){for(const id of [...pointers.keys()])release(id);if(keyHeld){keyHeld=false;onPointer('lever-key',null,false);}owner=null;value=0;paintLever();}
 function route(p,hit,y){
  if(hit==='throttle'||hit==='brake'){
   if(owner===p.id){owner=null;value=0;lever.classList.remove('pressed');paintLever();}p.target=hit;onPointer(p.id,hit,true);return;
  }
  if(hit==='lever'||p.target==='lever'){
   if(owner!==null&&owner!==p.id){onPointer(p.id,null,true);return;}
   if(p.target!=='lever'){p.origin=y;p.range=Math.max(32,Math.min(52,lever.clientHeight*.32));value=0;owner=p.id;p.target='lever';}
   value=clamp((p.origin-y)/p.range);lever.classList.add('pressed');paintLever();onPointer(p.id,leverCommand(value),true);return;
  }
  p.target=null;onPointer(p.id,null,true);
 }
 for(const el of root.querySelectorAll('[data-drive-target]')){
  el.onpointerdown=e=>{if(!canDrive()||(e.pointerType==='mouse'&&e.button!==0)||pointers.has(e.pointerId))return;const target=el.dataset.driveTarget;if(target==='lever'&&owner!==null)return;e.preventDefault();const p={id:e.pointerId,capture:el,target:null,origin:e.clientY,range:48};pointers.set(p.id,p);el.setPointerCapture(p.id);route(p,target,e.clientY);};
  el.onpointermove=e=>{const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drive-target]');route(p,hit&&root.contains(hit)?hit.dataset.driveTarget:null,e.clientY);};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>release(e.pointerId));
  el.oncontextmenu=e=>e.preventDefault();
 }
 lever.onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home','Escape'].includes(e.key)||!canDrive())return;e.preventDefault();e.stopPropagation();keyHeld=true;value=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;onPointer('lever-key',leverCommand(value),true);paintLever();};
 lever.onkeyup=e=>{if(!['ArrowUp','ArrowDown','Home','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();keyHeld=false;onPointer('lever-key',null,false);if(owner===null){value=0;paintLever();}};
 lever.onblur=()=>{if(keyHeld){keyHeld=false;onPointer('lever-key',null,false);if(owner===null){value=0;paintLever();}}};
 paintLever();return{clear,get activeCount(){return pointers.size;},snapshot:()=>({active:pointers.size,owner,value,command:leverCommand(value)}),paint(input){for(const key of ['brake','throttle']){const b=root.querySelector('[data-control='+key+']');b.classList.toggle('pressed',!!input[key]);b.setAttribute('aria-pressed',String(!!input[key]));}root.dataset.brake=String(!!input.brake);root.dataset.throttle=String(!!input.throttle);if(owner===null){value=input.reverse?1:input.drift?-1:0;paintLever();}}};
}
