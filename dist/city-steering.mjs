import {steeringGrip} from './drive-console.mjs?v=graphite-1';
const clamp=v=>Math.max(-1,Math.min(1,v));
export function createSlide(){return{id:null,origin:0,range:1,value:0};}
export function beginSlide(s,id,x,width){if(s.id!==null)return false;s.id=id;s.origin=x;s.range=72;s.value=0;return true;}
export function moveSlide(s,id,x){if(id!==s.id)return;s.value=clamp((s.origin-x)/s.range);}
export function releaseSlide(s,id=s.id){if(id!==s.id)return;s.id=null;s.value=0;}
export function installCitySteering({canDrive,onChange}){
 const pad=document.getElementById('thumb-steering'),knob=pad.querySelector('.thumb-knob'),label=pad.querySelector('.thumb-caption');
 const selectors=['steering-mode','pause-steering-mode'].map(id=>document.getElementById(id));
 const slide=createSlide();let mode=new URLSearchParams(location.search).get('steering')==='buttons'?'buttons':'slide';
 const paint=()=>{pad.classList.toggle('pressed',slide.id!==null);const grip=steeringGrip(slide.value);knob.style.left=grip.left+'%';knob.style.top=grip.top+'%';knob.style.transform='translate(-50%,-50%)';pad.setAttribute('aria-valuenow',String(Math.round(-slide.value*100)));pad.setAttribute('aria-valuetext',slide.value===0?'중앙':(slide.value>0?'왼쪽 ':'오른쪽 ')+Math.round(Math.abs(slide.value)*100)+'%');label.textContent=slide.id===null?'조향':'놓으면 중앙으로';};
 const clear=()=>{const id=slide.id;releaseSlide(slide);if(id!==null&&pad.hasPointerCapture(id))pad.releasePointerCapture(id);paint();};
 const sync=()=>{document.body.dataset.steering=mode;pad.hidden=mode!=='slide';document.querySelector('.steering').hidden=mode==='slide';selectors.forEach(s=>s.value=mode);paint();};
 selectors.forEach(s=>s.onchange=()=>{clear();mode=s.value==='slide'?'slide':'buttons';onChange();sync();});
 pad.onpointerdown=e=>{if(mode!=='slide'||!canDrive()||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();if(beginSlide(slide,e.pointerId,e.clientX,pad.clientWidth)){pad.setPointerCapture(e.pointerId);paint();}};
 pad.onpointermove=e=>{if(e.pointerId!==slide.id)return;e.preventDefault();moveSlide(slide,e.pointerId,e.clientX);paint();};
 const release=e=>{if(e.pointerId!==slide.id)return;clear();};
 pad.onpointerup=release;pad.onpointercancel=release;pad.onlostpointercapture=release;pad.oncontextmenu=e=>e.preventDefault();
 // Keyboard steering remains available, with key-up clearing the command.
 pad.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();};
 sync();return{clear,get mode(){return mode;},get active(){return slide.id!==null;},get value(){return slide.value;},snapshot:()=>({mode,active:slide.id!==null,value:slide.value})};
}
