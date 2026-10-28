export const CATALOG=[
{id:'paint-stock',category:'paint',name:'원래 도색',price:0,description:'기존 차량의 원래 재질',color:null},
{id:'paint-red',category:'paint',name:'레이싱 레드',price:0,description:'Rosso Corsa의 선명한 레드 참고 · 유광 솔리드',color:'#ba081b',metalness:.08,roughness:.24},
{id:'paint-green',category:'paint',name:'펄 그린',price:0,description:'Verde Mantis의 녹색 참고 · 미세한 펄 반사',color:'#56b818',metalness:.28,roughness:.27},
{id:'paint-yellow',category:'paint',name:'펄 옐로',price:0,description:'Giallo Midas의 노란색 참고 · 미세한 펄 반사',color:'#edbd12',metalness:.24,roughness:.26},
{id:'paint-orange',category:'paint',name:'펄 오렌지',price:0,description:'Arancio Borealis의 주황색 참고 · 미세한 펄 반사',color:'#dd5815',metalness:.25,roughness:.26},
{id:'wheels-stock',category:'wheels',name:'원래 휠',price:0,description:'기존 차량의 원래 휠'},
{id:'wheels-five',category:'wheels',name:'실버 5스포크',price:0,description:'296 Speciale의 굵은 5스포크와 절삭면 대비 참고',color:'#b7bdc4',kind:'five'},
{id:'wheels-split',category:'wheels',name:'다크 분기 스포크',price:0,description:'Giano의 각진 기하학적 인상 참고 · 게임용 분기 형태',color:'#505965',kind:'split'},
{id:'wheels-fifteen',category:'wheels',name:'실버 15스포크',price:0,description:'750S JC96 Delta의 가는 15스포크 구성 참고',color:'#969fa9',kind:'fifteen'}];
export const itemById=id=>CATALOG.find(i=>i.id===id);
export function normalizeSave(){return{coins:0,owned:CATALOG.map(i=>i.id),garage:{tavaculo:{paint:'paint-red',wheels:'wheels-five'}}};}
export function transact(save,car,id){const item=itemById(id);if(!item||car!=='tavaculo')return{ok:false};save.garage[car][item.category]=id;return{ok:true,item,purchased:false};}
