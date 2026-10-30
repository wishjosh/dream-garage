// Isolated study catalog: both vehicles use the stock road-car physics.
export const CARS=['tavaculo','porsche'];
export const CATEGORIES={paint:'도색',wheels:'휠',engine:'엔진',tires:'타이어',brakes:'브레이크'};
export const CATALOG=[
 {id:'paint-stock',category:'paint',name:'원래 도색',price:0,description:'처음 만난 모습 그대로',color:null},
 {id:'paint-mint',category:'paint',name:'아쿠아 민트',price:150,description:'수변 도시를 닮은 산뜻한 민트',color:'#42e6c5'},
 {id:'paint-sunset',category:'paint',name:'선셋 오렌지',price:250,description:'노을처럼 빛나는 나만의 색',color:'#ff8b3d'},
 {id:'paint-violet',category:'paint',name:'드림 바이올렛',price:300,description:'네온 야경과 어울리는 보랏빛',color:'#ae83ff'},
 {id:'paint-blue',category:'paint',name:'일렉트릭 블루',price:250,description:'도시를 가르는 선명한 파랑',color:'#339cff'},
 {id:'wheels-stock',category:'wheels',name:'원래 휠',price:0,description:'차량 고유의 휠 디자인'},
 {id:'wheels-gold',category:'wheels',name:'골드 스타',price:400,description:'골드 링과 다섯 갈래 스포크',color:'#ffce64',spokes:5},
 {id:'wheels-neon',category:'wheels',name:'네온 터빈',price:550,description:'민트 링과 열 갈래 스포크',color:'#5ff5e9',spokes:10},
 {id:'engine-stock',category:'engine',name:'기본 엔진',price:0,description:'처음부터 편안하게 달리는 엔진',force:1,maxSpeed:1},
 {id:'engine-sprint',category:'engine',name:'스프린트 엔진',price:650,description:'출발과 코너 탈출이 더 힘차게',force:1.18,maxSpeed:1},
 {id:'engine-gt',category:'engine',name:'GT 엔진',price:1100,description:'엔진 힘 +10% · 속도 한계 +8%',force:1.1,maxSpeed:1.08},
 {id:'tires-stock',category:'tires',name:'기본 타이어',price:0,description:'도심 코스를 위한 기본 접지',grip:1},
 {id:'tires-grip',category:'tires',name:'그립 타이어',price:500,description:'접지 +18% · 코너에서 더 든든하게',grip:1.18},
 {id:'brakes-stock',category:'brakes',name:'기본 브레이크',price:0,description:'속도를 줄이는 기본 제동 장치',brake:1},
 {id:'brakes-sport',category:'brakes',name:'스포츠 브레이크',price:400,description:'제동력 +20% · 코너 진입을 준비해요',brake:1.2}
];
export const DEFAULT_LOADOUT=Object.fromEntries(Object.keys(CATEGORIES).map(c=>[c,c+'-stock']));
export const itemById=id=>CATALOG.find(item=>item.id===id);
export function normalizeSave(raw){
 const source=raw&&typeof raw==='object'&&raw.version===1?raw:{};
 const owned=new Set(CATALOG.filter(i=>i.price===0).map(i=>i.id));
 if(Array.isArray(source.owned))for(const id of source.owned)if(itemById(id))owned.add(id);
 const garage={};for(const car of CARS){garage[car]={...DEFAULT_LOADOUT};for(const c of Object.keys(CATEGORIES)){const id=source.garage?.[car]?.[c];if(owned.has(id)&&itemById(id)?.category===c)garage[car][c]=id;}}
 const best={};for(const car of CARS)if(Number.isFinite(source.best?.[car])&&source.best[car]>=0)best[car]=source.best[car];
 const courseBest={};for(const id of ['bayfront-long-1'])if(source.courseBest?.[id]){courseBest[id]={};for(const car of CARS)if(Number.isFinite(source.courseBest[id][car])&&source.courseBest[id][car]>=0)courseBest[id][car]=source.courseBest[id][car];}
 return {version:1,courseBest,coins:Math.max(0,Math.min(1e9,Math.floor(Number(source.coins)||0))),best,car:CARS.includes(source.car)?source.car:'tavaculo',view:source.view==='cockpit'?'cockpit':'chase',assist:source.assist!==false,auto:!!source.auto,owned:[...owned],garage,races:Math.max(0,Math.floor(Number(source.races)||0))};
}
export function transact(save,car,id){
 const item=itemById(id);if(!item||!CARS.includes(car))return {ok:false,reason:'invalid'};
 const owned=save.owned.includes(id);if(!owned&&save.coins<item.price)return {ok:false,reason:'funds',missing:item.price-save.coins};
 if(!owned){save.coins-=item.price;save.owned.push(id);}
 save.garage[car][item.category]=id;
 return {ok:true,purchased:!owned,item};
}
export function tuning(save,car){
 const loadout=save.garage[car];return {force:itemById(loadout.engine).force,maxSpeed:itemById(loadout.engine).maxSpeed,grip:itemById(loadout.tires).grip,brake:itemById(loadout.brakes).brake};
}
