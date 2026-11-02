const $=id=>document.getElementById(id);let frame,loadedLayout;
const rows=[];
function check(ok,message,data){rows.push({ok:!!ok,message,data});$('report').textContent=JSON.stringify(rows,null,2);if(!ok)throw Error(message);}
async function load(car,view,scenario,width=874,height=402,layout='spacious'){
 if(frame&&loadedLayout!==layout){frame.remove();frame=null;}loadedLayout=layout;
 if(frame?.contentWindow?.__raceQA){const w=frame.contentWindow;frame.width=width;frame.height=height;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));w.__raceQA.configureReview({car,view,scenario,traffic:'pack'});w.__raceQA.advance(4,{});return w;}
 frame=document.createElement('iframe');frame.width=width;frame.height=height;$('stage').append(frame);
 const params=new URLSearchParams({car,view,scenario,layout,traffic:'pack',facilities:'before',spectators:'before',qa:'1',review:'1'});
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
  const campus=frame.contentWindow.__raceQA.snapshot().campus;
  check(campus.art.barriers===120&&campus.art.fencePanels===84&&campus.art.tyres===36&&campus.art.fenceAlphaTest===.5,'외부 원본 파츠 로드·투명 철망 구성',campus.art);
  check(campus.markers.length===9&&campus.markers.filter(m=>m.direction==='left').map(m=>m.number).join(',')==='4,6','코너 방향·번호와 시설 구성',{markers:campus.markers,pitBays:campus.pitBays,standRows:campus.standRows});
  check(campus.surfaceChecks.length===4&&campus.surfaceChecks.every(r=>r.minHeightAboveTerrain>.08),'관리·진입·보행 포장이 지형 표시 위에 있음',campus.surfaceChecks);
  $('status').textContent='회복 공간에서 직접 복귀';let w=await load('tavaculo','chase','runoff'),q=w.__raceQA;
  const before=q.snapshot();q.advanceDriver(12);let s=q.snapshot();
  check(before.player.surface==='runoff'&&s.player.surface==='road'&&s.recovery.count===0,'런오프에서 조향·가속으로 복귀',{before:before.player.surface,after:s.player.surface,recovery:s.recovery.count,grounded:s.player.grounded});
  $('status').textContent='피트 대기·합류';w=await load('porsche','cockpit','pit');q=w.__raceQA;
  check(q.snapshot().campus.signal.state==='approach','피트 진입에서는 정지 안내');
  q.advanceDriver(6);const wait=q.snapshot();q.advanceDriver(20);s=q.snapshot();
  check(s.study.metrics.gateWait>1&&s.study.metrics.mergeReleases===1&&s.player.pit.merged,'교통 대기 뒤 피트 합류',{wait:wait.study,final:s.study,player:s.player});
  check(s.campus.signal.state==='go'||s.campus.signal.state==='idle','해제·합류 뒤 신호 표시',s.campus.signal);
  check(w.__cockpitReviewErrors.length===0,'피트 실행 오류 없음',w.__cockpitReviewErrors);
  const original={coins:s.coins,races:s.races,best:s.best};
  check(s.coins===0&&s.races===0&&Object.keys(s.best).length===0,'상금·기록 없음',original);
  $('status').textContent='실행 검사 통과 · '+rows.length+'항목';
 }catch(error){$('status').textContent='검사 실패: '+error.message;rows.push({ok:false,error:String(error.stack||error)});$('report').textContent=JSON.stringify(rows,null,2);}
 finally{$('run').disabled=false;}
};

$('pit-view').onclick=async()=>{await load('tavaculo','chase','pitlane',1200,640);$('status').textContent='피트 비교 · 정지된 동일 시점';};
$('cockpit-view').onclick=async()=>{await load('porsche','cockpit','start',1200,640);$('status').textContent='포르쉐 운전석 · 출발 직선';};

$('compact-view').onclick=async()=>{await load('tavaculo','chase','pitlane',1200,640,'compact');$('status').textContent='조정안 · 정지된 동일 시점';};
$('layout-run').onclick=async()=>{
 $('layout-run').disabled=true;rows.length=0;
 try{
  for(const car of ['tavaculo','porsche']){
   let w=await load(car,'chase','pitlane',874,402,'spacious'),before=w.__raceQA.snapshot();
   w=await load(car,'chase','pitlane',874,402,'compact');const q=w.__raceQA,after=q.snapshot();
   check(JSON.stringify(before.appearance.dimensions)===JSON.stringify(after.appearance.dimensions)&&before.cameraFov===after.cameraFov,car+' 배치 전환에도 차량 치수·화각 유지',{dimensions:after.appearance.dimensions,fov:after.cameraFov,before:before.campus.layout,after:after.campus.layout});
   check(Math.abs(after.player.x-20)<.1&&after.campus.layout.apron===6&&after.campus.pitBays===before.campus.pitBays,car+' 조정된 피트·정비동 배치',after.campus);
   let merged=false;for(let i=0;i<40;i++){q.advanceDriver(1);merged ||= q.snapshot().player.pit.merged;}const s=q.snapshot();
   check(merged&&s.study.metrics.mergeReleases===1&&s.player.grounded===4&&s.recovery.count===0,car+' 조정안 실제 화면에서 정지·합류 완료',s.study);
   check(w.__cockpitReviewErrors.length===0,car+' 조정안 실행 오류 없음',w.__cockpitReviewErrors);
  }
  $('status').textContent='배치 비교 검사 통과 · '+rows.length+'항목';
 }catch(error){$('status').textContent='검사 실패: '+error.message;rows.push({ok:false,error:String(error.stack||error)});$('report').textContent=JSON.stringify(rows,null,2);}
 finally{$('layout-run').disabled=false;}
};

$('facility-view').onclick=async()=>{const w=await load('tavaculo','chase','start',1200,540,'compact'),r=w.__raceQA.reviewFacility($('facility').value);$('status').textContent=r.name+' · 현행 시설 / Ferrari 같은 크기 / 점검용 카메라';$('report').textContent=JSON.stringify(r,null,2);};
