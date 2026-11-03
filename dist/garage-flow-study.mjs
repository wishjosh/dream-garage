import {normalizeSave} from './garage-core.mjs?v=circuit-main-1';
export const STUDY_KEY='dream-garage:garage-flow-study:v1';
export function freshStudySave(){return normalizeSave({version:1,coins:1000});}
export function createStudyStore(storage){
 return {read(){try{const raw=storage?.getItem(STUDY_KEY);return raw?normalizeSave(JSON.parse(raw)):freshStudySave();}catch{return freshStudySave();}},write(save){try{storage?.setItem(STUDY_KEY,JSON.stringify(save));return true;}catch{return false;}}};
}
export function categoriesFor(screen){return screen==='performance'?['engine','tires','brakes']:['paint','wheels'];}
export function itemMarkup({item,owned,equipped,active,pending,thumbnail,stockColor='#e92b27'}){
 const art=item.category==='paint'?`<span class="flow-color" style="--paint:${item.color||stockColor}"></span>`:item.category==='wheels'?`<img class="flow-wheel" src="${thumbnail}" alt="">`:`<span class="flow-part" aria-hidden="true">${{engine:'⚙',tires:'◉',brakes:'⊕'}[item.category]}</span>`;
 const state=equipped?'장착 중':owned?'보유':item.price.toLocaleString()+' C';
 return `<button class="shop-item ${equipped?'equipped ':''}${active?'previewing':''}" data-item="${item.id}" aria-label="${item.name} · ${state}" aria-pressed="${active}" ${equipped&&!pending?'disabled':''}>${art}<strong>${item.name}</strong><span class="item-price">${state}</span>${['paint','wheels'].includes(item.category)?'':`<small>${item.description}</small>`}${active?'<span class="flow-check" aria-hidden="true">✓</span>':''}</button>`;
}
export function installGarageFlow({getState,cancel,selectCategory,refresh,reset,onScreen}){
 const $=id=>document.getElementById(id),menu=$('menu');let screen='home',modern=new URLSearchParams(location.search).get('layout')!=='classic';
 const css=document.createElement('link');css.rel='stylesheet';css.href='./garage-flow.css?v=garage-flow-1';document.head.append(css);
 document.body.classList.add('flow-study');
 const bar=document.createElement('header');bar.className='flow-compare';bar.innerHTML='<span>꾸미기 비교 <small>체험용 1,000 C</small></span><div role="group" aria-label="화면 비교"><button data-layout="classic">기존</button><button data-layout="new">수정안</button></div><button id="flow-reset">체험 초기화</button>';menu.prepend(bar);
 const panel=menu.querySelector('.garage-panel');
 const heading=document.createElement('div');heading.className='flow-heading';heading.innerHTML='<button id="flow-back" aria-label="차고로 돌아가기">‹ 차고</button><h2 id="flow-title">내 차고</h2>';panel.prepend(heading);
 const home=document.createElement('nav');home.className='flow-home';home.setAttribute('aria-label','차고 메뉴');home.innerHTML='<button data-screen="cars" class="flow-car"><small>내 차 바꾸기</small><strong id="flow-car-name"></strong><span>›</span></button><button data-screen="customize"><span class="flow-menu-icon">◈</span><strong>꾸미기</strong><small>도색 · 휠</small><span>›</span></button><button data-screen="performance"><span class="flow-menu-icon">⚙</span><strong>성능</strong><small>엔진 · 타이어 · 브레이크</small><span>›</span></button><button data-screen="race" class="flow-race"><strong>경주 준비</strong><span>→</span></button>';panel.append(home);
 const empty=document.createElement('div');empty.className='flow-empty';empty.textContent='장착할 아이템을 골라보세요';panel.querySelector('.launch-bar').prepend(empty);
 const done=document.createElement('button');done.id='flow-done';done.textContent='차고로 돌아가기';done.className='flow-done';panel.querySelector('.launch-bar').append(done);
 const note=document.createElement('small');note.className='flow-note';note.textContent='체험용 상금·장착 · 본게임 저장과 별도';home.append(note);
 for(const b of document.querySelectorAll('[data-save-transfer-open]'))b.hidden=true;
 const settings=menu.querySelector('.garage-settings');
 function sync(){const state=getState();menu.dataset.flowScreen=screen;document.body.classList.toggle('flow-modern',modern);$('flow-car-name').textContent=state.carName;screen==='home'?$('flow-back').hidden=true:$('flow-back').hidden=false;$('flow-title').textContent={home:'내 차고',cars:'내 차 선택',customize:'꾸미기',performance:'성능',race:'경주 준비'}[screen];for(const b of bar.querySelectorAll('[data-layout]'))b.setAttribute('aria-pressed',String((b.dataset.layout==='new')===modern));empty.hidden=!!state.pending;done.hidden=!!state.pending;settings.open=modern&&screen==='race';}
 function go(next){cancel('');screen=next;if(['customize','performance'].includes(screen))selectCategory(categoriesFor(screen)[0]);onScreen(screen);sync();refresh();if(modern)$('flow-title').setAttribute('tabindex','-1');if(modern)$('flow-title').focus({preventScroll:true});}
 for(const b of home.querySelectorAll('[data-screen]'))b.onclick=()=>go(b.dataset.screen);
 $('flow-back').onclick=()=>go('home');done.onclick=()=>go('home');
 for(const b of bar.querySelectorAll('[data-layout]'))b.onclick=()=>{cancel('');modern=b.dataset.layout==='new';screen=modern?'home':'customize';selectCategory('paint');const url=new URL(location.href);url.searchParams.set('layout',modern?'new':'classic');history.replaceState(null,'',url);onScreen(screen);sync();refresh();};
 $('flow-reset').onclick=()=>{reset();go('home');};
 sync();return {sync,home:()=>go('home'),get modern(){return modern;},get screen(){return screen;},categories:()=>modern?categoriesFor(screen):null};
}
