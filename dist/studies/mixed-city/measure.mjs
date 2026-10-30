export const STUDY_VERSION='mixed-city-2';
export const carLabel=car=>car==='porsche'?'포르쉐':'페라리';
export function profilesFor(reverse=false){const cars=reverse?['porsche','tavaculo']:['tavaculo','porsche'];return ['chase','cockpit'].flatMap(view=>cars.map(car=>({car,view})));}
export function summarize(values){const a=[...values].sort((a,b)=>a-b),sum=values.reduce((a,b)=>a+b,0),at=p=>a[Math.min(a.length-1,Math.floor(a.length*p))]||0;return{frames:values.length,averageFps:sum?1000*values.length/sum:0,p95Ms:at(.95),over33ms:values.filter(v=>v>33.4).length};}
export function installStudy({start,pause,drive,state,look,phase}){
 const $=id=>document.getElementById(id),dialog=$('city-measure'),status=$('city-measure-status');let active=false,autoDrive=false,profiles=[],index=0,started=0,last=0,intervals=[],results=[],size='',sampleStart=null,lastAudit=0;
 const label=p=>carLabel(p.car)+(p.view==='chase'?' 외관':' 운전석·거울');
 for(const b of document.querySelectorAll('[data-city-look]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);look(Number(b.dataset.cityLook));};const release=()=>look(null);b.onpointerup=b.onpointercancel=b.onlostpointercapture=b.onkeyup=b.onblur=release;b.onkeydown=e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();look(Number(b.dataset.cityLook));}};}
 function stop(message,complete=false){active=autoDrive=false;document.body.dataset.cityMeasuring='false';pause();$('city-auto').textContent='검토용 자동 주행';$('city-auto').setAttribute('aria-pressed','false');$('city-progress').hidden=true;status.textContent=message;if(!complete){results=[];$('city-share').value='';$('city-performance-state').textContent='{}';}if(!dialog.open)dialog.showModal();}
 for(const b of document.querySelectorAll('[data-city-measure]')){b.disabled=false;b.onclick=()=>{pause();dialog.showModal();};}
 $('city-measure-close').onclick=()=>dialog.close();
 $('city-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('city-share').value);$('city-copy').textContent='복사했어요';}catch{$('city-share').focus();$('city-share').select();$('city-copy').textContent='선택한 결과를 복사해 주세요';}};
 $('city-auto').onclick=()=>{autoDrive=!autoDrive;$('city-auto').textContent=autoDrive?'자동 주행 끄기':'검토용 자동 주행';$('city-auto').setAttribute('aria-pressed',String(autoDrive));};
 function begin(){started=last=0;sampleStart=null;intervals=[];start(profiles[index]);}
 $('city-measure-start').onclick=()=>{active=true;autoDrive=false;document.body.dataset.cityMeasuring='true';look(null);profiles=profilesFor($('city-order').value==='porsche');index=0;results=[];size=innerWidth+'x'+innerHeight;$('city-share').value='';$('city-performance-state').textContent='{}';$('city-copy').textContent='결과 복사';dialog.close();$('city-progress').hidden=false;begin();};
 $('city-measure-cancel').onclick=()=>stop('측정을 중단했습니다. 중간 결과는 폐기했습니다.');
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('화면이 숨겨져 측정을 중단했습니다.');});
 addEventListener('blur',()=>{look(null);if(active)stop('다른 창으로 이동해 측정을 중단했습니다.');});
 addEventListener('resize',()=>{if(active&&size!==innerWidth+'x'+innerHeight)stop('화면 크기가 바뀌었습니다. 방향을 고정하고 다시 실행해 주세요.');});
 return{drive:()=>active||autoDrive?drive():null,frame(now){
  let current=null;if(now-lastAudit>500){current=state();$('city-state').textContent=JSON.stringify({...current,version:STUDY_VERSION,storage:'memory-only',measuring:active,autoDrive});lastAudit=now;}
  if(!active)return;const p=profiles[index],head=phase();
  if(head.view!==p.view||head.car!==p.car||!['race','countdown'].includes(head.mode)){stop('주행 상태가 바뀌어 측정을 중단했습니다.');return;}
  if(!started)started=now;const elapsed=now-started;
  if(elapsed>=5000&&last){sampleStart??=current||state();if(head.pixelRatio!==sampleStart.pixelRatio){stop('표시 배율이 바뀌어 측정을 중단했습니다.');return;}intervals.push(now-last);}
  last=now;$('city-progress-text').textContent=`${index+1}/4 ${label(p)} · ${elapsed<5000?'준비 중':Math.min(20,Math.floor((elapsed-5000)/1000))+' / 20초'}`;
  if(elapsed<25000)return;
  results.push({...summarize(intervals),...p,start:sampleStart,end:current||state()});index++;
  if(index<profiles.length){begin();return;}
  const data={version:STUDY_VERSION,results,userAgent:navigator.userAgent,devicePixelRatio,conditions:'Same city and stock game handling. Ferrari 2 + Porsche 2. Per case 5s warm-up + 20s measured. Fixed renderer ratio; real rear/visible side mirrors in cockpit. No long heat assessment.'};
  $('city-performance-state').textContent=JSON.stringify(data);
  $('city-share').value=STUDY_VERSION+' · 페라리 2대 + 포르쉐 2대 도시 주행\n'+results.map(r=>`${label(r)}: ${r.averageFps.toFixed(1)} fps / 33ms 초과 ${r.over33ms}/${r.frames} / p95 ${r.p95Ms.toFixed(1)}ms\n화면 ${r.end.viewport.width}×${r.end.viewport.height} / 배율 ${r.start.pixelRatio}→${r.end.pixelRatio} / 상대차 복귀 ${r.end.aiRecoveryCount}회 / ${r.end.mirrorStats.active?'룸미러 '+r.end.mirrorStats.width+'×'+r.end.mirrorStats.height+' / '+r.end.mirrorStats.hz+'Hz / 사이드미러 '+r.end.sideMirrorStats.filter(m=>m.active).length+'개':'거울 꺼짐'}`).join('\n')+'\n도시·물리·상대차 3대 포함 / 각 20초 측정 / 장시간 발열 별도\n'+navigator.userAgent;
  stop('측정 완료. 결과를 복사해 전달해 주세요.',true);
 }};
}
