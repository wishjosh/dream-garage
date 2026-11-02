const $=id=>document.getElementById(id),visitor=document.body.dataset.comparison==='spectators',afterLabel=visitor?'수정안':'기준 배치';let frame,loaded=null,token=0;
const notes={paddock:{before:'이전: 270×105m 구역 전체를 하나의 건물로 표시 · 셔터 폭 27m',split:'수정: 48×18m 정비동 2동 · 셔터 폭 5m · 준비 마당과 통행 공간 분리'},medical:{before:'이전: 130×75m 구역 전체를 하나의 건물로 표시 · 셔터 폭 13m',split:'수정: 24×14m 운영 사무동 + 24×20m 구난차 차고 · 셔터 폭 4.8m · 열린 앞마당'}};
notes.stand={before:'이전: 200×40m 관람석 · 좌석 줄 간격 2.5~3m · 간판 폭 70m',split:'수정: 84×20m · 좌석 1,440석 / 12줄 · 좌석 간격 0.55m / 줄 간격 0.85m · 계단 통로'};
notes.parking={before:'이전: 240×95m · 18m 간격의 긴 선만 표시',split:'수정: 96×70m · 2.7×5.5m 주차칸 144면 · 통행로 7m / 양끝 연결 통로'};
const zoneNames={paddock:'패독',medical:'운영 구역',stand:'관람석',parking:'주차장'};
async function show(){
 const current=++token,variant=$('variant').value,car=$('car').value,zone=$('zone').value;
 $('loading').hidden=false;$('error').textContent='';$('toggle').disabled=true;for(const id of ['zone','car','variant','framing'])$(id).disabled=true;
 try{
  if(!frame||loaded!==variant){frame?.remove();frame=document.createElement('iframe');frame.id='facility-frame';frame.title='차량과 시설 배치 비교';loaded=variant;
   const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('불러오기가 지연됩니다. 배치를 다시 선택해 주세요.')),30000);frame.onload=()=>{clearTimeout(timer);resolve();};frame.onerror=()=>{clearTimeout(timer);reject(Error('화면을 불러오지 못했습니다.'));};});
   frame.src='./run.html?'+new URLSearchParams({layout:'compact',facilities:visitor?'split':variant,spectators:visitor?(variant==='split'?'scaled':'before'):'scaled',car,view:'chase',scenario:'start',traffic:'clear',qa:'1',review:'1'});$('stage').prepend(frame);await ready;
   const w=frame.contentWindow,start=performance.now();
   while(!w.__raceQA){if(!frame.contentDocument.getElementById('fatal')?.hidden)throw Error(frame.contentDocument.getElementById('fatal-message')?.textContent||'불러오기 실패');if(performance.now()-start>90000)throw Error('불러오기가 지연됩니다. 배치를 다시 선택해 주세요.');await new Promise(r=>setTimeout(r,100));if(current!==token)return;}
   w.__cockpitReviewSetFrozen(true);
  }
  if(current!==token)return;const w=frame.contentWindow;if(!w.__cockpitReviewStorageIsolated)throw Error('비교 화면 격리 실패');
  w.__raceQA.configureReview({car,view:'chase',scenario:'start',traffic:'clear'});w.__raceQA.advance(4,{});
  const result=w.__raceQA.reviewFacility(zone,{wide:$('framing').value==='wide'});frame.contentDocument.getElementById('hud').hidden=true;$('comparison-state').textContent=JSON.stringify({...result,carId:car,variant});
  $('status').textContent=zoneNames[zone]+' · '+(variant==='split'?afterLabel:'이전 모습');$('details').textContent=notes[zone][variant];$('toggle').textContent=variant==='split'?'이전 모습 보기':afterLabel+' 보기';
 }catch(e){if(current===token){$('error').textContent=e.message;loaded=null;}}
 finally{if(current===token){$('loading').hidden=true;$('toggle').disabled=false;for(const id of ['zone','car','variant','framing'])$(id).disabled=false;}}
}
for(const id of ['zone','car','variant','framing'])$(id).onchange=show;
$('toggle').onclick=()=>{$('variant').value=$('variant').value==='split'?'before':'split';show();};show();
