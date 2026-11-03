const $=id=>document.getElementById(id),names={start:'출발선',pit:'피트 앞',corner:'첫 코너 진입'};
let frame,loaded=null,token=0,driving=false,driveView='chase';
const review=new URLSearchParams(location.search).get('review')==='1';$('review-details').hidden=!review;
function state(){return {car:$('car').value,view:'chase',scenario:$('zone').value==='corner'?'corner':'start',corner:1,traffic:'clear'};}
function controls(disabled){for(const id of ['zone','car','variant','toggle','drive','stop'])$(id).disabled=disabled;}
async function show({drive=false}={}){
 if(driving&&frame?.contentWindow.__raceQA)driveView=frame.contentWindow.__raceQA.snapshot().view;
 const current=++token,variant=$('variant').value;controls(true);$('loading').hidden=false;$('error').textContent='';
 try{
  if(!frame||loaded!==variant){frame?.remove();frame=document.createElement('iframe');frame.id='art-frame';frame.title='서킷 미술 비교와 주행';frame.allow='fullscreen';loaded=variant;
   const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('화면을 불러오지 못했어요. 다시 선택해 주세요.')),45000);frame.onload=()=>{clearTimeout(timer);resolve();};frame.onerror=()=>{clearTimeout(timer);reject(Error('화면을 불러오지 못했어요.'));};});
   frame.src='./run.html?'+new URLSearchParams({...state(),comparison:'1',look:variant,approach:'circuit',layout:'compact',facilities:'split',spectators:'scaled',signage:'scaled',v:'art-daylight-1'});$('stage').prepend(frame);await ready;
   const start=performance.now();while(!frame.contentWindow.__raceQA){if(current!==token)return;const doc=frame.contentDocument;if(!doc.getElementById('fatal')?.hidden)throw Error(doc.getElementById('fatal-message')?.textContent||'준비 실패');if(performance.now()-start>120000)throw Error('준비가 지연되고 있어요. 다시 선택해 주세요.');await new Promise(resolve=>setTimeout(resolve,100));}
  }
  if(current!==token)return;const w=frame.contentWindow,qa=w.__raceQA;
  if(driving&&!drive&&review){const s=qa.snapshot();$('drive-state').textContent=JSON.stringify({mode:s.mode,view:s.view,player:s.player,drawCalls:s.drawCalls,triangles:s.triangles,errors:w.__circuitComparison.errors},null,2);}
  frame.contentDocument.getElementById('compare-layout').hidden=true;
  frame.contentDocument.getElementById('choose-course').textContent='비교';
  w.__circuitComparison.setFrozen(true);qa.configureReview({...state(),view:drive?driveView:'chase'});qa.advance(4,{});
  driving=drive;document.body.classList.toggle('driving',drive);$('stop').hidden=!drive;frame.contentDocument.getElementById('hud').hidden=!drive;
  // Give resize listeners the final viewport before placing the fixed comparison camera.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(drive){w.__circuitComparison.setFrozen(false);frame.focus();}else{$('comparison-state').textContent=JSON.stringify(qa.reviewArt($('zone').value),null,2);}
  $('toggle').textContent=variant==='daylight'?'이전 모습 보기':'수정안 보기';$('status').textContent=names[$('zone').value]+' · '+(variant==='daylight'?'수정안 · 자연광과 주변 재질':'이전 모습')+' · 같은 차량·위치·시점';
 }catch(error){if(current===token){$('error').textContent=error.message;loaded=null;}}
 finally{if(current===token){$('loading').hidden=true;controls(false);}}
}
for(const id of ['zone','car','variant'])$(id).onchange=()=>show();
$('toggle').onclick=()=>{$('variant').value=$('variant').value==='daylight'?'before':'daylight';show({drive:driving});};
$('drive').onclick=()=>show({drive:true});$('stop').onclick=()=>show();
$('measure').onclick=()=>{const s=frame?.contentWindow.__raceQA?.snapshot();if(s)$('drive-state').textContent=JSON.stringify({mode:s.mode,view:s.view,player:s.player,pixelRatio:s.pixelRatio,frameMs:s.frameMs,drawCalls:s.drawCalls,triangles:s.triangles,storage:'isolated memory; no main save',errors:frame.contentWindow.__circuitComparison.errors},null,2);};
addEventListener('message',event=>{if(event.source===frame?.contentWindow&&event.origin===location.origin&&event.data?.type==='circuit-elevation:choose')show();});
show();
