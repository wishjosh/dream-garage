const $=id=>document.getElementById(id),f=(n,d=2)=>Number(n).toFixed(d);
let data,worker;
function tableRows(rows){return rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('');}
function render(){
 const a=data.before,b=data.after,low=m=>Math.abs(m.low.find(x=>x.speed===1&&x.sign===1).errorPercent),conv=m=>m.convergence.find(x=>x.dt===1/120).positionError*100,stop=m=>m.braking.find(x=>x.speed===60).stop.time;
 $('cards').innerHTML=[['1 km/h 회전 오차',f(low(a),1)+'% →',f(low(b),3)+'%','같은 핸들 각도, 일정 속도 시험'],['계산 간격에 따른 경로 차이',f(conv(a),1)+'cm →',f(conv(b),1)+'cm','3초 가속 코너 · 1/120초 대 1/480초'],['60 km/h에서 정지까지',f(stop(a))+'초 →',f(stop(b))+'초','브레이크 100% · 정지 기준 0.1m/s']].map(([title,old,value,note])=>'<article class="card"><h2>'+title+'</h2><div class="value"><small>'+old+'</small><br>'+value+'</div><p>'+note+'</p></article>').join('');
 $('checks').innerHTML=b.checks.map((c,i)=>'<tr><td>'+c.name+'</td><td>'+c.kind+'</td>'+[a.checks[i],c].map(x=>'<td class="'+(x.pass?'pass':'fail')+'">'+(x.pass?'통과':'수정 필요')+'</td>').join('')+'</tr>').join('');
 $('iterations').innerHTML=tableRows(data.iterations.map(x=>[x.name,f(x.maxLowError,3)+'%',f(x.convergenceMetres*100,2)+'cm']));
 plot();
}
function plot(){
 const mode=$('scenario').value,a=data.before,b=data.after;let aa,bb,xLabel,yLabel,note,rows,zero=false;
 if(mode==='low'){
  aa=a.low.filter(x=>x.sign===1).map(x=>[x.speed,x.errorPercent]);bb=b.low.filter(x=>x.sign===1).map(x=>[x.speed,x.errorPercent]);xLabel='앞 방향 속도 (km/h)';yLabel='회전 속도 오차 (%)';zero=true;
  note='같은 작은 조향각(앞바퀴 2.64°)을 20초 유지했습니다. 속도를 고정하는 시험 장치를 사용했고, 마지막 회전 속도를 운동식과 비교했습니다.';
  rows=aa.map((x,i)=>[x[0]+' km/h',f(x[1],3)+'%',f(bb[i][1],3)+'%']);
 }else if(mode.startsWith('corner')){
  const speed=Number(mode.slice(6)),ca=a.corners.find(x=>x.speed===speed&&x.sign===1),cb=b.corners.find(x=>x.speed===speed&&x.sign===1);
  aa=ca.samples.map(s=>[s.x,s.z]);bb=cb.samples.map(s=>[s.x,s.z]);xLabel='왼쪽 이동 (m)';yLabel='앞 방향 이동 (m)';
  note=speed+' km/h에서 가속·제동 없이 동일한 조향 입력 25%를 1.5초 유지했습니다. 겹쳐 보이는 경로는 기존 중·고속 반응을 보존했다는 뜻입니다. 자유 주행·벽 접촉 없음.';
  rows=[['차체 회전 반경 추정(U/r)',f(ca.radius)+'m',f(cb.radius)+'m'],['차체 미끄럼각',f(ca.beta)+'°',f(cb.beta)+'°'],['앞이 밀린 시간',f(ca.underTime)+'초',f(cb.underTime)+'초']];
 }else if(mode==='recovery'){
  const ca=a.recovery.find(x=>x.speed===60&&x.sign===1&&x.brake===.4),cb=b.recovery.find(x=>x.speed===60&&x.sign===1&&x.brake===.4);
  aa=ca.samples.map(s=>[s.t,s.v]);bb=cb.samples.map(s=>[s.t,s.v]);xLabel='경과 시간 (초)';yLabel='차체 옆 속도 (m/s)';zero=true;
  note='두 모델 모두 60 km/h·옆 속도 −2.5m/s·회전 속도 0.5rad/s로 시작합니다. 핸들을 놓고 브레이크 40%를 유지합니다. 기존에도 통과한 회복 반응은 유지했습니다.';
  rows=[['회복 기준 진입(이후 0.5초 유지)',f(ca.time,3)+'초',f(cb.time,3)+'초'],['4초 뒤 차체 미끄럼각',f(ca.endBeta,3)+'°',f(cb.endBeta,3)+'°']];
 }else{
  const ca=a.power.find(x=>x.speed===60&&x.sign===1),cb=b.power.find(x=>x.speed===60&&x.sign===1);
  aa=ca.samples.map(s=>[s.t,s.beta]);bb=cb.samples.map(s=>[s.t,s.beta]);xLabel='경과 시간 (초)';yLabel='차체 미끄럼각 (°)';zero=true;
  note='60 km/h로 출발해 조향 25%·가속 100%를 1.5초 유지한 뒤, 핸들을 놓고 브레이크 40%로 감속합니다. 같은 입력 이력의 비교이며, 감속 시작 순간의 속도까지 동일한 시험은 아닙니다.';
  rows=[['3초 뒤 차체 미끄럼각',f(ca.endBeta,3)+'°',f(cb.endBeta,3)+'°'],['뒤가 흐른 시간',f(ca.overTime,3)+'초',f(cb.overTime,3)+'초']];
 }
 const all=[...aa,...bb],W=780,H=340,p={l:76,r:25,t:30,b:55};let xmin=Math.min(...all.map(x=>x[0])),xmax=Math.max(...all.map(x=>x[0])),ymin=Math.min(...all.map(x=>x[1])),ymax=Math.max(...all.map(x=>x[1]));
 if(zero){ymin=Math.min(0,ymin);ymax=Math.max(0,ymax);}const pad=Math.max((ymax-ymin)*.07,.001);ymin-=pad;ymax+=pad;if(xmax===xmin)xmax=xmin+1;
 const x=n=>p.l+(n-xmin)/(xmax-xmin)*(W-p.l-p.r),y=n=>H-p.b-(n-ymin)/(ymax-ymin)*(H-p.t-p.b);
 let svg='<title>'+xLabel+' / '+yLabel+'</title>';
 for(let i=0;i<=4;i++){const xx=xmin+(xmax-xmin)*i/4,yy=ymin+(ymax-ymin)*i/4;svg+='<path d="M'+p.l+','+y(yy)+' H'+(W-p.r)+'" stroke="#2b4055"/><text x="'+(p.l-10)+'" y="'+(y(yy)+4)+'" text-anchor="end" fill="#a4bacb" font-size="13">'+f(yy,mode==='low'?0:1)+'</text><text x="'+x(xx)+'" y="'+(H-p.b+25)+'" text-anchor="middle" fill="#a4bacb" font-size="13">'+f(xx,1)+'</text>';}
 if(zero)svg+='<path d="M'+p.l+','+y(0)+' H'+(W-p.r)+'" stroke="#8095a5" stroke-dasharray="4 6"/>';
 for(const [series,color,dash] of [[aa,'#f4ae7e','7 5'],[bb,'#80e4c8','']])svg+='<path d="'+series.map((q,i)=>(i?'L':'M')+x(q[0]).toFixed(2)+','+y(q[1]).toFixed(2)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-dasharray="'+dash+'"/>';
 svg+='<text x="'+p.l+'" y="16" fill="#ccdeeb" font-size="13">'+yLabel+'</text><text x="'+(W/2)+'" y="'+(H-5)+'" text-anchor="middle" fill="#ccdeeb" font-size="13">'+xLabel+'</text>';
 $('plot').innerHTML=svg;$('plot').setAttribute('aria-label',xLabel+'에 따른 '+yLabel+' 수정 전후 비교');$('plot-note').textContent=note;$('numbers').innerHTML=tableRows(rows);
}
$('scenario').onchange=plot;
$('rerun').onclick=()=>{
 $('rerun').disabled=true;$('run-status').textContent='이 기기에서 같은 입력으로 다시 계산하고 있습니다…';
 worker?.terminate();worker=new Worker(new URL('./handling-bench-worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=event=>{data.before=event.data.before;data.after=event.data.after;render();$('run-status').textContent='이 기기 재계산 완료 · 개선 후 '+data.after.checks.filter(x=>x.pass).length+'/6 기준 통과 · 실제 화면 성능 시험과는 별개입니다.';$('rerun').disabled=false;worker.terminate();};
 worker.onerror=()=>{$('run-status').textContent='재계산하지 못했습니다. 저장된 측정값으로 비교할 수 있습니다.';$('rerun').disabled=false;worker.terminate();};
 worker.postMessage('run');
};
try{const response=await fetch('./handling-results.json?v=audit-1');if(!response.ok)throw Error();data=await response.json();render();$('run-status').textContent='저장된 동일 조건 시험 · 개선 후 '+data.after.checks.filter(x=>x.pass).length+'/6 기준 통과';}catch{$('run-status').textContent='측정값을 불러오지 못했습니다. 연결을 확인한 뒤 새로고침해 주세요.';}
