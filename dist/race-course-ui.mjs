import {RACE_COURSES,courseURL} from './race-courses.mjs?v=courses-main-1';
import {mapProjection} from './race-hud.mjs?v=race-hud-1';
const time=value=>{const m=Math.floor(value/60),s=(value%60).toFixed(2).padStart(5,'0');return m+':'+s;};
function diagram(track){const projection=mapProjection(track.bounds,120,96,12),points=track.frames.filter((_,i)=>i%3===0).map(f=>projection.point(f.x,f.z));const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ')+'Z',p=projection.point(track.frames[0].x,track.frames[0].z);return `<svg viewBox="0 0 120 96" aria-hidden="true"><path d="${path}"/><rect x="${p[0]-2}" y="${p[1]-2}" width="4" height="4"/></svg>`;}
export function installRaceCourses({course,track,getSave,getCar,onOpen,onChoose,canChoose=()=>true,navigate=url=>location.assign(url)}){
 const $=id=>document.getElementById(id),dialog=$('race-course-dialog');let picked=course.key;
 function render(){const save=getSave(),car=getCar();$('course-options').innerHTML=RACE_COURSES.map(c=>{const t=c.create(),best=save.courseBest?.[c.id]?.[car];return `<button type="button" class="course-option" data-race-course="${c.key}" aria-pressed="${c.key===picked}">${diagram(t)}<span class="course-copy"><small>${c.type} · ${(t.length/1000).toFixed(2)} km · 한 바퀴</small><strong>${c.name}</strong><span>${c.description}</span><em>${Number.isFinite(best)?'이 차의 최고 '+time(best):'이 차의 첫 기록에 도전해요'}</em></span><span class="course-check" aria-hidden="true">${c.key===picked?'✓':''}</span></button>`;}).join('');for(const button of $('course-options').querySelectorAll('[data-race-course]'))button.onclick=()=>{picked=button.dataset.raceCourse;for(const b of $('course-options').querySelectorAll('[data-race-course]')){const selected=b.dataset.raceCourse===picked;b.setAttribute('aria-pressed',String(selected));b.querySelector('.course-check').textContent=selected?'✓':'';}};}
 const open=()=>{if(!canChoose())return;onOpen();picked=course.key;render();dialog.showModal();dialog.scrollTop=0;$('course-dialog-title').focus({preventScroll:true});};
 $('course-open').onclick=open;$('result-course').onclick=open;
 $('course-dialog-close').onclick=() =>dialog.close();
 $('course-apply').onclick=()=>{if(picked===course.key){dialog.close();return;}onChoose();$('course-apply').disabled=true;$('course-apply').textContent='코스를 준비하고 있어요…';navigate(courseURL(location.href,picked));};
 $('course-open').setAttribute('aria-label','경주 코스 변경 · '+course.name);$('selected-course-name').textContent=course.shortName;$('selected-course-details').textContent=(track.length/1000).toFixed(2)+' km · 한 바퀴';
 $('race-brief').textContent='총 4대 · 1위 1,000 / 2위 650 / 3위 400 / 4위 150 C';
 $('race-course-info').textContent=course.name+' · '+course.focus;
 $('course-title').textContent=course.name;$('pause-course-name').textContent=course.name+' · 한 바퀴';
 const params=new URLSearchParams(location.search);if(params.get('garage')==='1'){params.delete('garage');const url=new URL(location.href);url.search=params.toString();history.replaceState(null,'',url);$('enter-garage').click();}
 return{open,render};
}
