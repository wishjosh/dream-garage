import {mapProjection} from '../../race-hud.mjs';

// Original vector instruments; all values come from the running game.
export function installGrandTouringHud() {
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./gt-hud.css',import.meta.url).href;document.head.append(sheet);
 const hud=document.getElementById('hud'),root=document.createElement('div');root.id='gt-readout';
 const ticks=Array.from({length:41},(_,i)=>{const a=(200-i*5.5)*Math.PI/180,r=i%5?86:80;return `<line x1="${110+Math.cos(a)*r}" y1="${107-Math.sin(a)*r}" x2="${110+Math.cos(a)*92}" y2="${107-Math.sin(a)*92}" class="${i>=35?'red':''}"/>`;}).join('');
 const numbers=[0,2,4,6,8].map((n,i)=>{const a=(200-i*55)*Math.PI/180;return `<text x="${110+Math.cos(a)*68}" y="${110-Math.sin(a)*68}">${n}</text>`;}).join('');
 root.innerHTML=`
  <div class="gt-position"><span class="gt-eyebrow">POSITION</span><div><b id="gt-rank">4</b><span id="gt-total">/ 4</span><i></i><span class="gt-distance"><small>주행</small><strong id="gt-progress">8<span>%</span></strong></span></div><div class="gt-progress-rail"><span id="gt-progress-fill"></span></div></div>
  <div class="gt-timing"><span class="gt-eyebrow">경과 시간</span><strong id="gt-time">0:00.00</strong></div>
  <button id="gt-map" aria-label="전체 코스 지도 보기 · 일시정지"><svg viewBox="0 0 160 92" aria-hidden="true"><path class="gt-map-shadow"/><path class="gt-map-line"/><g id="gt-map-cars"></g></svg><span id="gt-course">브레이크 루프</span></button>
  <div class="gt-instrument" aria-label="속도와 기어, 회전수, 입력량">
   <svg class="gt-tach" viewBox="0 0 220 145" aria-hidden="true"><g class="gt-ticks">${ticks}</g><g class="gt-rpm-numbers">${numbers}</g><path class="gt-rpm-base" d="M23.55 138.47 A92 92 0 1 1 196.45 138.47" pathLength="100"/><path id="gt-rpm-arc" d="M23.55 138.47 A92 92 0 1 1 196.45 138.47" pathLength="100"/><text class="gt-rpm-unit" x="110" y="46">RPM × 1000</text></svg>
   <div class="gt-flat-rpm" aria-hidden="true"><span>RPM</span><i><b id="gt-rpm-flat"></b></i></div>
   <div class="gt-speed-group"><strong id="gt-speed">0</strong><span>km/h</span></div><div class="gt-gear-group"><strong id="gt-gear">N</strong><span id="gt-mode">AT</span></div>
   <div class="gt-input-bars"><div class="gt-brake-input"><span>BRK</span><i><b id="gt-brake-bar"></b></i></div><div class="gt-gas-input"><span>THR</span><i><b id="gt-gas-bar"></b></i></div></div>
   <div class="gt-steer-line"><i></i><b id="gt-steer-dot"></b></div>
  </div>`;
 hud.append(root);
 const byId=id=>root.querySelector('#'+id);
 const refs=Object.fromEntries(['rank','total','progress','progress-fill','time','course','speed','gear','mode','rpm-arc','rpm-flat','map-cars','brake-bar','gas-bar','steer-dot'].map(id=>[id,byId('gt-'+id)]));
 byId('gt-map').onclick=()=>document.getElementById('map-open').click();
 let currentTrack=null,projection=null,markers=[];
 const svgNS='http://www.w3.org/2000/svg';
 function update({readout,elapsed,rank,player,racers,track,course}) {
  if(document.body.dataset.controlsDesign!=='gt')return;
  refs.rank.textContent=rank;refs.total.textContent='/ '+racers.length;
  const progress=Math.max(0,Math.min(100,player.distance/track.length*100));
  refs.progress.innerHTML=Math.floor(progress)+'<span>%</span>';refs['progress-fill'].style.width=progress+'%';
  const minutes=Math.floor(elapsed/60),seconds=(elapsed%60).toFixed(2).padStart(5,'0');refs.time.textContent=minutes+':'+seconds;
  refs.speed.textContent=readout.kmh;refs.gear.textContent=readout.gear;refs.mode.textContent=readout.mode;refs['rpm-arc'].style.strokeDasharray=(readout.rpm/8000*100)+' 100';
  refs['rpm-flat'].style.width=(readout.rpm/8000*100)+'%';refs['rpm-flat'].classList.toggle('red',readout.rpm>6800);
  refs['rpm-arc'].classList.toggle('red',readout.rpm>6800);refs.course.textContent=course;
  if(currentTrack!==track){
   currentTrack=track;projection=mapProjection(track.bounds,160,92,10);
   const path=track.frames.filter((_,i)=>i%3===0).map((f,i)=>(i?'L':'M')+projection.point(f.x,f.z).map(v=>v.toFixed(2)).join(',')).join(' ')+' Z';
   root.querySelectorAll('.gt-map-shadow,.gt-map-line').forEach(p=>p.setAttribute('d',path));
  }
  if(markers.length!==racers.length){refs['map-cars'].replaceChildren();markers=racers.map(()=>{const c=document.createElementNS(svgNS,'circle');refs['map-cars'].append(c);return c;});}
  racers.forEach((r,i)=>{const point=projection.point(r.x,r.z),self=r===player;markers[i].setAttribute('cx',point[0]);markers[i].setAttribute('cy',point[1]);markers[i].setAttribute('r',self?4:2.3);markers[i].setAttribute('class',self?'gt-map-player':'gt-map-rival');});
 }
 function input(values,steer){
  if(document.body.dataset.controlsDesign!=='gt')return;
  refs['gas-bar'].style.width=(Number(values.throttle)*100)+'%';refs['brake-bar'].style.width=(Number(values.brake)*100)+'%';refs['steer-dot'].style.left=(50-steer*43)+'%';
 }
 return{update,input};
}
