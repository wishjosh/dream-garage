import {CARS,CATEGORIES,CATALOG} from './garage-core.mjs?v=circuit-lineup-1';
import {CAR_NAMES,presentItem} from './vehicle-presentation.mjs?v=porsche-main-1';
import {RACE_COURSES} from './race-courses.mjs?v=circuit-lineup-1';
import {courseDiagram} from './race-course-ui.mjs?v=pit-lab-1';
import {LEVELS} from './opponent-difficulty.mjs?v=pit-lab-1';

const paths={
 flag:'<path d="M5 21V4c5-4 9 4 15 0v10c-6 4-10-4-15 0"/><path d="m9 5 1 7m4-6 1 7"/>',
 tune:'<path d="m14 6 3 3 4-4a6 6 0 0 1-8 8l-6 7a2.2 2.2 0 0 1-3-3l7-6a6 6 0 0 1 7-8z"/>',
 course:'<path d="M5 17c-4-2-2-7 1-7h4l2-5c1-3 6-3 7 0l2 8c1 4-3 7-6 5l-4-3-3 2z"/>',
 settings:'<path d="M3 7h7m4 0h7M3 17h10m4 0h4"/><circle cx="12" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
 cars:'<path d="M3 15v-4l3-1 3-4h6l3 4 3 1v4h-2m-12 0h10"/><circle cx="6" cy="15" r="2"/><circle cx="18" cy="15" r="2"/>',
 left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 rotate:'<path d="M4 12c0 3 4 5 8 5s8-2 8-5-4-5-8-5H8m2-3L6 7l4 3"/>',
 paint:'<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12z"/>',
 wheels:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="m12 10 0-6m2 7 6-2m-7 5 4 5m-6-5-4 5m3-8L4 9"/>',
 engine:'<path d="M3 9h4l2-3h6l2 3h3v8h-3l-2 2H9l-3-3H3zM10 3h5M2 11v4"/>',
 tires:'<ellipse cx="12" cy="12" rx="8" ry="9"/><ellipse cx="14" cy="12" rx="4" ry="6"/><path d="m6 7 3 1m-4 4 3 1m-2 3 3 1"/>',
 brakes:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M14 3c6 0 9 7 6 11l-3-2c1-3-1-6-4-6z"/>'
};
const icon=name=>'<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>';
const action=(key,label,art,extra='')=>'<button type="button" data-pit="'+key+'" '+extra+'>'+icon(art)+'<span>'+label+'</span></button>';
const arrow=(key,label,art)=>'<button type="button" class="pit-icon" data-pit="'+key+'" aria-label="'+label+'">'+icon(art)+'</button>';
const dollars=n=>n.toLocaleString()+' C';
const settingPages=[
 [['steering-mode','조향'],['view-select','카메라'],['assist','운전 보조'],['auto-throttle','자동 가속']],
 [['gaze-follow','조향 따라 보기'],['body-motion','차체 움직임'],['impact-audio','주행 소리']],
];
const statNames={force:'엔진 힘',maxSpeed:'최고속도',grip:'접지력',brake:'제동력'};
function upgrade(item){
 return Object.entries(statNames).filter(([key])=>item[key]>1).map(([key,name])=>name+' +'+Math.round((item[key]-1)*100)+'%').join(' · ');
}

export function installPitDesk({course,track,read,selectCar,applySetup,enterLab,exitLab,previewItem,applyItem,rotate}){
 const $=id=>document.getElementById(id),menu=$('menu'),stage=menu.querySelector('.garage-stage');
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('pit-desk.css?v=pit-lab-1',import.meta.url);document.head.append(css);
 document.body.classList.add('pit-ui');
 let page='home',sheet='',group='paint',itemIndex=0,courseIndex=0,level,settingsPage=0;
 const tracks=new Map([[course.key,track]]);
 const title={cars:'차량 선택',setup:'경주 설정',settings:'설정 · 기록'};
 const desk=document.createElement('div');desk.id='pit-desk';
 desk.innerHTML='<header class="pit-head"><div class="pit-room-name"><span class="pit-mark" aria-hidden="true"></span><b id="pit-location">내 차고</b></div><div class="pit-meta"><span id="pit-coins" aria-label="상금"></span>'+arrow('settings','설정과 기록','settings')+'</div></header>'+
 '<section class="pit-home"><button class="pit-vehicle" data-pit="cars" aria-label="차량 선택">'+icon('cars')+'<strong id="pit-car"></strong>'+icon('right')+'</button><nav class="pit-actions" aria-label="차고 메뉴">'+action('lab','튜닝실','tune')+'<button type="button" data-pit="setup">'+icon('course')+'<span><strong id="pit-course"></strong><small id="pit-level"></small></span></button></nav></section>'+
 '<div class="pit-lab-tools">'+action('home','차고','left')+'<div class="pit-orbit">'+arrow('orbit-left','차량 왼쪽으로 회전','left')+'<span>'+icon('rotate')+'360°</span>'+arrow('orbit-right','차량 오른쪽으로 회전','right')+'</div></div>'+
 '<section class="pit-lab"><nav class="pit-tabs" aria-label="튜닝 항목">'+Object.entries(CATEGORIES).map(([key,name])=>action('group-'+key,name,key)).join('')+'</nav><div class="pit-item-row">'+arrow('prev-item','이전 상품','left')+'<div class="pit-item"><span id="pit-sample" aria-hidden="true"></span><div aria-live="polite"><strong id="pit-item-name"></strong><small id="pit-item-detail"></small></div></div>'+arrow('next-item','다음 상품','right')+'<button id="pit-apply" data-pit="apply" class="pit-primary"></button></div></section>';
 const dialog=document.createElement('dialog');dialog.id='pit-sheet';dialog.setAttribute('aria-labelledby','pit-sheet-title');
 dialog.innerHTML='<header><h2 id="pit-sheet-title" tabindex="-1"></h2>'+arrow('close','닫기','close')+'</header><div id="pit-sheet-body"></div>';
 const launch=$('start');launch.className='pit-primary';launch.innerHTML=icon('flag')+'<span>출전</span>';
 desk.querySelector('.pit-actions').append(launch);menu.append(desk,dialog);
 const stageLabel=()=>stage.setAttribute('aria-label',page==='lab'?'차량을 좌우로 끌어 360도 회전':'차고에 주차한 차량');
 const articles=()=>CATALOG.filter(i=>i.category===group);
 function update(){
  const state=read();
  menu.dataset.pitPage=page;stageLabel();
  $('pit-location').textContent=page==='lab'?'튜닝실':'내 차고';
  $('pit-coins').textContent=dollars(state.save.coins);
  $('pit-car').textContent=CAR_NAMES[state.car];
  $('pit-course').textContent=course.shortName;$('pit-level').textContent=LEVELS[state.difficulty].name+' · 경주 설정';
  if(page!=='lab')return;
  const options=articles(),source=options[itemIndex],item=presentItem(source,state.car),equipped=state.save.garage[state.car][group]===item.id,owned=state.save.owned.includes(item.id);
  const label=equipped?'장착 중':owned?'장착':state.save.coins<item.price?'잔액 부족':'구매 · 장착';
  for(const tab of desk.querySelectorAll('.pit-tabs button'))tab.setAttribute('aria-pressed',String(tab.dataset.pit==='group-'+group));
  const sample=$('pit-sample');sample.innerHTML=group==='paint'?'':icon(group);
  sample.style.setProperty('--sample',item.color||(group==='paint'?(state.car==='porsche'?'#e1e4df':'#be3231'):'#bdc9c6'));sample.dataset.group=group;
  $('pit-item-name').textContent=item.name;
  $('pit-item-detail').textContent=(itemIndex+1)+' / '+options.length+'  ·  '+(upgrade(item)||'')+(upgrade(item)?'  ·  ':'')+(owned?'보유':dollars(item.price));
  $('pit-apply').textContent=label;$('pit-apply').disabled=equipped||(!owned&&state.save.coins<item.price);
 }
 const selectGroup=key=>{
  group=key;const state=read();itemIndex=Math.max(0,articles().findIndex(i=>i.id===state.save.garage[state.car][group]));
  previewItem(articles()[itemIndex].id);update();
 };
 function goHome(){
  page='home';menu.dataset.pitPage=page;exitLab();update();
 }
 function toLab(){
  page='lab';menu.dataset.pitPage=page;enterLab();selectGroup('paint');desk.querySelector('[data-pit=home]').focus({preventScroll:true});
 }
 function renderSheet(){
  const state=read(),body=$('pit-sheet-body');
  if(sheet==='setup'){
   const c=RACE_COURSES[courseIndex];if(!tracks.has(c.key))tracks.set(c.key,c.create());
   const t=tracks.get(c.key);
   body.innerHTML='<div class="pit-track-row">'+arrow('prev-course','이전 코스','left')+'<div class="pit-track">'+courseDiagram(t)+'<div aria-live="polite"><small>코스 '+(courseIndex+1)+' / '+RACE_COURSES.length+'</small><strong>'+c.shortName+'</strong><small>'+(t.length/1000).toFixed(2)+' km · 1바퀴</small></div></div>'+arrow('next-course','다음 코스','right')+'</div><fieldset><legend>상대차 난이도</legend><div class="pit-levels">'+Object.entries(LEVELS).map(([k,l])=>'<button data-pit="level-'+k+'" aria-pressed="'+(k===level)+'">'+l.name+'</button>').join('')+'</div></fieldset><button class="pit-primary pit-wide" data-pit="save-setup">적용</button>';
  }else if(sheet==='cars'){
   body.innerHTML='<div class="pit-car-list">'+CARS.map(k=>'<button data-pit="car-'+k+'" aria-pressed="'+(k===state.car)+'">'+icon('cars')+'<strong>'+CAR_NAMES[k]+'</strong><span>'+(k===state.car?'✓':'›')+'</span></button>').join('')+'</div>';
  }else{
   const fields=settingPages[settingsPage]||[];
   const best=state.save.courseBest?.[course.id]?.[state.car];
   const record=Number.isFinite(best)?Math.floor(best/60)+':'+(best%60).toFixed(2).padStart(5,'0'):'기록 없음';
   const rows=fields.map(([id,label])=>{const original=$(id);
    if(original.tagName==='SELECT')return '<label><span>'+label+'</span><select data-setting="'+id+'">'+[...original.options].map(o=>'<option value="'+o.value+'" '+(o.selected?'selected':'')+'>'+o.textContent+'</option>').join('')+'</select></label>';
    return '<label><span>'+label+'</span><input type="checkbox" role="switch" data-setting="'+id+'" '+(original.checked?'checked':'')+'></label>';
   }).join('');
   const transfer=menu.querySelector('[data-save-transfer-open]');
   const links=settingsPage===2?'<div class="pit-record"><span>'+course.shortName+' · 최고 기록</span><strong>'+record+'</strong></div><div class="pit-extra">'+(transfer&&!transfer.hidden?'<button data-pit="transfer">기록 옮기기</button>':'')+'<button data-pit="help-open">조작 방법</button><button data-pit="credits-open">만든 자료</button><button data-pit="fullscreen">전체 화면</button></div>':'';
   body.innerHTML='<div class="pit-pager">'+arrow('prev-settings','이전 설정 페이지','left')+'<b>'+['운전','화면 · 소리','기록 · 안내'][settingsPage]+' <small>'+(settingsPage+1)+' / 3</small></b>'+arrow('next-settings','다음 설정 페이지','right')+'</div><div class="pit-options">'+rows+'</div>'+links;
  }
 }
 function openSheet(name){
  sheet=name;courseIndex=RACE_COURSES.findIndex(c=>c.key===course.key);level=read().difficulty;settingsPage=0;
  $('pit-sheet-title').textContent=title[name];renderSheet();dialog.showModal();$('pit-sheet-title').focus({preventScroll:true});
 }
 const localFocus=key=>dialog.querySelector('[data-pit="'+key+'"]')?.focus({preventScroll:true});
 function handle(event){
  const key=event.target.closest('[data-pit]')?.dataset.pit;if(!key)return;
  if(key==='lab')toLab();
  else if(key==='home'){goHome();desk.querySelector('[data-pit=lab]').focus({preventScroll:true});}
  else if(Object.hasOwn(title,key))openSheet(key);
  else if(key==='close')dialog.close();
  else if(key.startsWith('group-'))selectGroup(key.slice(6));
  else if(key.startsWith('orbit-'))rotate((key.endsWith('left')?-1:1)*Math.PI/4);
  else if(key.endsWith('-item')){const list=articles();itemIndex=(itemIndex+list.length+(key==='prev-item'?-1:1))%list.length;previewItem(list[itemIndex].id);update();}
  else if(key==='apply'){applyItem();update();}
  else if(key.endsWith('-course')){courseIndex=(courseIndex+RACE_COURSES.length+(key==='prev-course'?-1:1))%RACE_COURSES.length;renderSheet();localFocus(key);}
  else if(key.startsWith('level-')){level=key.slice(6);renderSheet();localFocus(key);}
  else if(key==='save-setup'){dialog.close();applySetup(RACE_COURSES[courseIndex].key,level);update();}
  else if(key.startsWith('car-')){selectCar(key.slice(4));update();dialog.close();}
  else if(key.endsWith('-settings')){settingsPage=(settingsPage+(key==='prev-settings'?2:1))%3;renderSheet();localFocus(key);}
  else {dialog.close();if(key==='transfer')menu.querySelector('[data-save-transfer-open]').click();else $(key)?.click();}
 }
 desk.addEventListener('click',handle);dialog.addEventListener('click',handle);
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('change',e=>{const original=$(e.target.dataset.setting);if(!original)return;if(original.type==='checkbox')original.checked=e.target.checked;else original.value=e.target.value;original.dispatchEvent(new Event('change',{bubbles:true}));});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&page==='lab'&&!menu.hidden&&!document.querySelector('dialog[open]')){goHome();desk.querySelector('[data-pit=lab]').focus({preventScroll:true});}});
 update();
 return {update,home(){if(page==='lab')goHome();else update();},get page(){return page;}};
}
