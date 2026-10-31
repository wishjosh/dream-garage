import {COURSES,createCourse} from './courses.mjs?v=city-geometry-1';
import {mapProjection} from '../../race-hud.mjs';
const $=id=>document.getElementById(id);let frame=null,loadToken=0,chosen=null;
function mapSVG(track){const projection=mapProjection(track.bounds,300,200,26),points=track.frames.filter((_,i)=>i%2===0).map(f=>projection.point(f.x,f.z)),d=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ')+' Z',start=projection.point(track.frames[0].x,track.frames[0].z);return `<svg viewBox="0 0 300 200" role="img" aria-label="${track.name} 실제 코스 평면도"><path d="${d}" fill="none" stroke="#aac0cb" stroke-opacity=".11" stroke-width="14" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#b3cbc6" stroke-width="3" stroke-linejoin="round"/><rect x="${start[0]-3}" y="${start[1]-3}" width="6" height="6" rx="1" fill="#f2f7f5"/></svg>`;}
for(const [i,c] of COURSES.entries()){const track=createCourse(c.id),card=document.createElement('article');card.className='course-card';card.innerHTML=`<div class="map-plate"><span class="number">0${i+1}</span>${mapSVG(track)}</div><div class="course-content"><span class="course-type">${c.type} / ${c.tag}</span><h2>${c.name}</h2><p>${c.description}</p><div class="facts"><span>${(track.length/1000).toFixed(2)} km</span><span>한 바퀴</span><span>4대</span></div><button class="launch" data-course="${c.id}" aria-label="${c.name} 달리기"><span>이 코스 달리기</span><span aria-hidden="true">↗</span></button></div>`;$('courses').append(card);card.querySelector('button').onclick=()=>launch(c);}
function choose(){loadToken++;frame?.remove();frame=null;$('drive').hidden=true;$('picker').hidden=false;document.body.style.overflow='';const b=document.querySelector(`[data-course="${chosen?.id||'speed'}"]`);b?.focus({preventScroll:true});$('course-study-state').textContent=JSON.stringify({screen:'picker',storage:'memory-only'});}
async function launch(c){
 const token=++loadToken;chosen=c;$('picker').hidden=true;$('drive').hidden=false;$('loading').hidden=false;document.body.style.overflow='hidden';$('loading-title').textContent=c.name+' 준비 중';$('loading-status').textContent='차량과 도시를 불러오고 있어요. 첫 실행에는 시간이 필요해요.';
 const car=$('car').value,view=$('view').value,params=new URLSearchParams({course:c.id,car,view,qa:'1',v:'city-geometry-1'});frame=document.createElement('iframe');frame.id='game';frame.title=c.name+' 주행';frame.allow='fullscreen';$('drive').prepend(frame);
 frame.src='./run.html?'+params;
 frame.addEventListener('load',async()=>{
  const current=frame;const started=performance.now();
  while(token===loadToken&&performance.now()-started<120000){
   try{const d=current.contentDocument,w=current.contentWindow;if(!d.getElementById('fatal')?.hidden){$('loading-status').textContent=d.getElementById('fatal-message')?.textContent||'불러오지 못했어요. 코스 선택으로 돌아가 다시 시도해 주세요.';return;}if(w.__raceQA&&!d.getElementById('start').disabled){
    d.getElementById('enter-garage').click();d.querySelector('[data-car="'+car+'"]').click();d.getElementById('view-select').value=view;d.getElementById('view-select').dispatchEvent(new w.Event('change'));d.getElementById('auto-throttle').checked=false;d.getElementById('assist').checked=true;d.getElementById('start').click();$('loading').hidden=true;current.focus();$('course-study-state').textContent=JSON.stringify({screen:'driving',course:c.id,car,view,length:createCourse(c.id).length,storage:'memory-only',tuning:'stock'});return;
   }const text=d.getElementById('load-status')?.textContent;if(text)$('loading-status').textContent=text;
   }catch(e){$('loading-status').textContent='시안을 열지 못했어요. 코스 선택으로 돌아가 다시 시도해 주세요.';return;}
   await new Promise(resolve=>setTimeout(resolve,150));
  }
  if(token===loadToken)$('loading-status').textContent='불러오기가 지연되고 있어요. 코스 선택으로 돌아가 다시 시도해 주세요.';
 });
}
$('cancel-load').onclick=choose;
addEventListener('message',event=>{if(frame&&event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='city-geometry:choose')choose();});
