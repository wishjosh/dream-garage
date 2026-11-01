const $=id=>document.getElementById(id);let frame;
const rows=[];
function check(ok,message,data){rows.push({ok:!!ok,message,data});$('report').textContent=JSON.stringify(rows,null,2);if(!ok)throw Error(message);}
async function load(car,view,scenario,width=874,height=402){
 if(frame?.contentWindow?.__raceQA){const w=frame.contentWindow;frame.width=width;frame.height=height;w.__raceQA.configureReview({car,view,scenario,traffic:'pack'});w.__raceQA.advance(4,{});return w;}
 frame=document.createElement('iframe');frame.width=width;frame.height=height;$('stage').append(frame);
 const params=new URLSearchParams({car,view,scenario,traffic:'pack',qa:'1',review:'1'});
 frame.src='./run.html?'+params;
 await Promise.race([new Promise(resolve=>frame.onload=resolve),new Promise((_,reject)=>setTimeout(()=>reject(Error('Frame navigation timeout')),15000))]);
 const w=frame.contentWindow,d=frame.contentDocument,start=performance.now();
 while(!w.__raceQA){if(!d.getElementById('fatal').hidden)throw Error(d.getElementById('fatal-message').textContent);if(performance.now()-start>120000)throw Error('Loading timeout');await new Promise(r=>setTimeout(r,150));}
 if(!w.__cockpitReviewStorageIsolated)throw Error('Isolation required');
 w.__cockpitReviewSetFrozen(true);d.getElementById('enter-garage').click();d.querySelector('[data-car="'+car+'"]').click();d.getElementById('start').click();w.__raceQA.advance(4,{});
 return w;
}
$('return').onclick=()=>location.href='./';
$('run').onclick=async()=>{
 $('run').disabled=true;rows.length=0;
 try{
  for(const car of ['tavaculo','porsche']){
   $('status').textContent=car+' 운전석·경사 검사';const w=await load(car,'cockpit','slope'),q=w.__raceQA,initial=q.snapshot();
   q.advanceDriver(24);const s=q.snapshot(),visibility=[20,40,80].map(d=>q.inspectVisibility(d));
   check(s.player.grounded===4&&s.player.y>1&&s.cockpitVisible,car+' 실제 운전석·경사·접지',{initialY:initial.player.y,y:s.player.y,grade:s.player.grade,eye:s.cockpitStats.eyeWorld,camera:s.camera,visibility,drawCalls:s.drawCalls,triangles:s.triangles});
   const sightSamples=[];for(const progress of [.10,.28,.42,.62,.83,.96]){q.reviewScene({progress});sightSamples.push({progress,camera:q.snapshot().camera,targets:[20,40,80].map(distance=>q.inspectVisibility(distance))});}
   check(true,car+' 여섯 위치 실제 운전석 시선 표본',sightSamples);
   check(w.__cockpitReviewErrors.length===0,car+' 실행 오류 없음',w.__cockpitReviewErrors);
  }
  $('status').textContent='회복 공간에서 직접 복귀';let w=await load('tavaculo','chase','runoff'),q=w.__raceQA;
  const before=q.snapshot();q.advanceDriver(12);let s=q.snapshot();
  check(before.player.surface==='runoff'&&s.player.surface==='road'&&s.recovery.count===0,'런오프에서 조향·가속으로 복귀',{before:before.player.surface,after:s.player.surface,recovery:s.recovery.count,grounded:s.player.grounded});
  $('status').textContent='피트 대기·합류';w=await load('porsche','cockpit','pit');q=w.__raceQA;
  q.advanceDriver(6);const wait=q.snapshot();q.advanceDriver(20);s=q.snapshot();
  check(s.study.metrics.gateWait>1&&s.study.metrics.mergeReleases===1&&s.player.pit.merged,'교통 대기 뒤 피트 합류',{wait:wait.study,final:s.study,player:s.player});
  check(w.__cockpitReviewErrors.length===0,'피트 실행 오류 없음',w.__cockpitReviewErrors);
  const original={coins:s.coins,races:s.races,best:s.best};
  check(s.coins===0&&s.races===0&&Object.keys(s.best).length===0,'상금·기록 없음',original);
  $('status').textContent='실행 검사 통과 · '+rows.length+'항목';
 }catch(error){$('status').textContent='검사 실패: '+error.message;rows.push({ok:false,error:String(error.stack||error)});$('report').textContent=JSON.stringify(rows,null,2);}
 finally{$('run').disabled=false;}
};
