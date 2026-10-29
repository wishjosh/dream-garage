export const STUDY_VERSION='ferrari-city-1';
export function summarize(intervals){
 const sorted=[...intervals].sort((a,b)=>a-b),at=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;
 const elapsed=intervals.reduce((a,b)=>a+b,0);
 return{frames:intervals.length,averageFps:elapsed?1000*intervals.length/elapsed:0,medianFps:at(.5)?1000/at(.5):0,p95Ms:at(.95),over33ms:intervals.filter(v=>v>33.4).length};
}
export function installStudy({start,pause,drive,state,look}){
 const $=id=>document.getElementById(id),dialog=$('city-measure'),status=$('city-measure-status');let active=false,profile=0,started=0,last=0,intervals=[],results=[],lastAudit=0,size='',startState=null,lastCopies='',autoDrive=false;
 const profiles=['chase','cockpit'];
 for(const button of document.querySelectorAll('[data-city-look]')){
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);look(Number(button.dataset.cityLook));};
  const release=()=>look(null);button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
  button.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();look(Number(button.dataset.cityLook));}};button.onkeyup=release;button.onblur=release;
 }
 addEventListener('blur',()=>look(null));

 for(const e of document.querySelectorAll('[data-city-measure]')){e.disabled=false;e.onclick=()=>{pause();dialog.showModal();};}
 $('city-measure-close').onclick=()=>dialog.close();
 $('city-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('city-share').value);$('city-copy').textContent='복사했어요';}catch{$('city-share').focus();$('city-share').select();$('city-copy').textContent='선택한 결과를 복사해 주세요';}};
 function stop(reason){active=false;autoDrive=false;document.body.dataset.cityMeasuring='false';pause();$('city-progress').hidden=true;status.textContent=reason;dialog.showModal();}
 function next(now){profile++;if(profile===profiles.length){const data={version:STUDY_VERSION,results,userAgent:navigator.userAgent,devicePixelRatio,conditions:'Actual city, physics and three rivals. 5s warm-up + 20s sampled per view. Live rear/visible side mirrors in cockpit. Visual automatic gearbox; existing game handling.'};$('city-performance-state').textContent=JSON.stringify(data);$('city-share').value=results.map(r=>`${r.profile==='chase'?'도시 외관':'도시 운전석'}: 평균 ${r.averageFps.toFixed(1)} fps / 중앙값 ${r.medianFps.toFixed(1)} fps / 33ms 초과 ${r.over33ms}/${r.frames} / p95 ${r.p95Ms.toFixed(1)}ms\n화면 ${r.end.viewport.width}×${r.end.viewport.height} / 배율 ${r.start.pixelRatio}→${r.end.pixelRatio} / ${r.end.mirrorStats.active?'룸미러 '+r.end.mirrorStats.width+'×'+r.end.mirrorStats.height+' / '+r.end.mirrorStats.hz+'Hz / 사이드미러 '+r.end.sideMirrorStats.filter(m=>m.active).length+'개':'거울 꺼짐'}`).join('\n')+'\n'+STUDY_VERSION+' / 도시·물리·상대차 3대 포함 / 각 20초 측정\n'+navigator.userAgent;stop('측정 완료. 결과를 복사해 전달해 주세요.');return;}start(profiles[profile]);started=now;intervals=[];startState=null;}
 $('city-measure-start').onclick=()=>{active=true;document.body.dataset.cityMeasuring='true';autoDrive=false;look(null);$('city-auto').textContent='검토용 자동 주행';$('city-auto').setAttribute('aria-pressed','false');profile=0;started=last=0;results=[];intervals=[];size=innerWidth+'x'+innerHeight;startState=null;$('city-share').value='';$('city-performance-state').textContent='{}';$('city-copy').textContent='결과 복사';dialog.close();$('city-progress').hidden=false;start(profiles[0]);};
 $('city-measure-cancel').onclick=()=>stop('측정을 중단했습니다. 중단된 결과는 사용하지 않습니다.');
 $('city-auto').onclick=()=>{autoDrive=!autoDrive;$('city-auto').textContent=autoDrive?'자동 주행 끄기':'검토용 자동 주행';$('city-auto').setAttribute('aria-pressed',String(autoDrive));};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('화면이 꺼져 측정을 중단했습니다.');});
 addEventListener('resize',()=>{if(active&&size!==innerWidth+'x'+innerHeight)stop('화면 크기가 바뀌어 측정을 중단했습니다. 방향을 고정하고 다시 실행해 주세요.');});
 addEventListener('blur',()=>{if(active)stop('다른 창으로 이동해 측정을 중단했습니다.');});
 return{
  drive:()=>active||autoDrive?drive():null,
  frame(now){
   const current=state();if(now-lastAudit>500){$('city-state').textContent=JSON.stringify({...current,version:STUDY_VERSION,storage:'memory-only',measuring:active,autoDrive});lastAudit=now;}
   if(!active)return;if(!started)started=now;
   if(current.view!==profiles[profile]){stop('시점이 바뀌어 측정을 중단했습니다. 다시 시작해 주세요.');return;}
   if(!['race','countdown'].includes(current.mode)){stop('주행이 일시정지되어 측정을 중단했습니다.');return;}
   const elapsed=now-started;if(elapsed>=5000&&last){startState??=current;intervals.push(now-last);}
   last=now;$('city-progress-text').textContent=`${profile?'운전석·거울':'외관'} ${elapsed<5000?'준비 중':Math.min(20,Math.floor((elapsed-5000)/1000))+' / 20초'} · 자동 주행`;
   if(elapsed>=25000){results.push({...summarize(intervals),profile:profiles[profile],start:startState,end:current});next(now);}
  }
 };
}
