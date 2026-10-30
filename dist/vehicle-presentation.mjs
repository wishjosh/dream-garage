// Keep persisted vehicle/item IDs stable: Ferrari inherits the existing road-car slot.
export const CAR_NAMES={tavaculo:'Ferrari 458',f2002:'클래식 F2002',porsche:'Porsche 911 Turbo S'};
export function presentItem(item,car){
 if(!item||!['tavaculo','porsche'].includes(car)||item.category!=='wheels'||!item.color)return item;
 return {...item,name:item.id==='wheels-gold'?'골드 림':'민트 림',description:(car==='porsche'?'포르쉐':'페라리')+' 원본 휠의 색상 변경 · 보유한 휠로 장착'};
}
