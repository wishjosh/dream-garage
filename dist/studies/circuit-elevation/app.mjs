import {pitLayout,layoutMeasurements} from './layout.mjs';
import {createPit} from './pit.mjs';
import {createCityCourse} from './course.mjs';
import {mapProjection} from '../../race-hud.mjs';
import {formatMeasure} from './performance.mjs';
const $=id=>document.getElementById(id),track=createCityCourse(),projection=mapProjection(track.bounds,420,250,25);
function path(points){return points.map((p,i)=>{const a=projection.point(p.x,p.z);return(i?'L':'M')+a.map(n=>n.toFixed(1)).join(',');}).join(' ');}
function showLayout(){
$('map-preview').innerHTML='<svg viewBox="0 0 420 250" role="img" aria-label="스피드 링과 피트 평면도"><path d="'+path(track.frames)+' Z" fill="#274541" stroke="#708e80" stroke-width="12" stroke-linejoin="round"/><path d="'+path(track.frames)+' Z" fill="none" stroke="#d4dfc6" stroke-width="3"/><path d="'+path(createPit(pitLayout($('layout').value)).PIT)+'" fill="none" stroke="#7aafc3" stroke-width="3"/><text x="26" y="235" fill="#bfd0bd" font-size="11">출발·피트 0m → 높은 구간 +8m</text></svg>';
const m=layoutMeasurements(pitLayout($('layout').value));$('layout-note').textContent=m.label+' · 본선–피트 '+m.trackPitGap.toFixed(1)+'m · 정비동 앞 '+m.apron+'m · 정비동 '+m.buildingLength+'×'+m.buildingDepth+'m · 셔터 폭 '+m.doorWidth+'m';
}
$('layout').onchange=showLayout;showLayout();
let frame=null,ready=false,token=0,scenario='start',loadedArt=null;
function choose(){token++;if(!ready){frame?.remove();frame=null;}$('drive').hidden=true;$('picker').hidden=false;document.body.style.overflow='';document.querySelector('[data-scenario="'+scenario+'"]')?.focus({preventScroll:true});}
async function launch(value){
 scenario=value;if(loadedArt!==$('art').value+':'+$('layout').value){frame?.remove();frame=null;ready=false;loadedArt=$('art').value+':'+$('layout').value;}$('performance-results').hidden=true;$('performance-text').value='';const current=++token;$('picker').hidden=true;$('drive').hidden=false;$('loading').hidden=false;document.body.style.overflow='hidden';
 const params=new URLSearchParams({scenario,layout:$('layout').value,art:$('art').value,car:$('car').value,view:$('view').value,traffic:$('traffic').value,qa:'1',review:'1',v:'circuit-elevation-1'});
 if(ready&&frame){frame.contentWindow.postMessage({type:'circuit-elevation:configure',options:{scenario,car:$('car').value,view:$('view').value,traffic:$('traffic').value}},location.origin);return;}
 frame=document.createElement('iframe');frame.id='game';frame.title='스피드 링 독립 지형 주행';frame.allow='fullscreen';$('drive').prepend(frame);frame.src='./run.html?'+params;
 frame.addEventListener('load',async()=>{const win=frame.contentWindow,doc=frame.contentDocument,start=performance.now();while(token===current&&performance.now()-start<120000){
  if(!doc.getElementById('fatal')?.hidden){$('loading-status').textContent=doc.getElementById('fatal-message')?.textContent;return;}
  if(win.__raceQA&&!doc.getElementById('start').disabled){doc.getElementById('enter-garage').click();doc.querySelector('[data-car="'+$('car').value+'"]').click();doc.getElementById('start').click();ready=true;$('loading').hidden=true;frame.focus();$('course-study-state').textContent=JSON.stringify({scenario,layout:$('layout').value,car:$('car').value,view:$('view').value,storage:'memory-only',length:track.length});return;}
  await new Promise(resolve=>setTimeout(resolve,150));}
  if(token===current)$('loading-status').textContent='불러오기가 지연되고 있어요. 장면으로 돌아가 다시 시도해 주세요.';
 });
}
document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>launch(b.dataset.scenario));$('cancel-load').onclick=choose;
addEventListener('message',event=>{if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin)return;if(event.data?.type==='circuit-elevation:compare-layout'){if(['chase','cockpit'].includes(event.data.view))$('view').value=event.data.view;$('layout').value=$('layout').value==='compact'?'spacious':'compact';showLayout();launch(scenario);return;}if(event.data?.type==='circuit-elevation:choose')choose();if(event.data?.type==='circuit-elevation:configured'){$('loading').hidden=true;frame.focus();$('course-study-state').textContent=JSON.stringify({scenario,layout:$('layout').value,car:$('car').value,view:$('view').value,storage:'memory-only',length:track.length});}if(event.data?.type==='circuit-elevation:performance'&&event.data.rows?.length){$('performance-results').hidden=false;$('performance-text').value='스피드 링 · '+scenario+'\n'+formatMeasure(event.data.rows,navigator.userAgent);}});
