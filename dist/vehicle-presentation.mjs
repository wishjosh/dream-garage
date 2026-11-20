// Keep persisted vehicle/item IDs stable: Ferrari inherits the existing road-car slot.
export const CAR_NAMES={tavaculo:'Ferrari 458',f2002:'클래식 F2002',porsche:'Porsche 911 Turbo S','rally-hatch':'랠리 핫해치','muscle-coupe':'클래식 머슬 쿠페'};
export function stockColor(car){return {'rally-hatch':'#153d99','muscle-coupe':'#273d24',porsche:'#e1e4df'}[car]||'#be3231';}
export function presentItem(item,car){
 if(!item||!['tavaculo','porsche','rally-hatch','muscle-coupe'].includes(car)||item.category!=='wheels'||!item.color)return item;
 return {...item,name:item.id==='wheels-gold'?'골드 림':'민트 림',description:({porsche:'포르쉐',tavaculo:'페라리'}[car]||CAR_NAMES[car])+' 원본 휠의 색상 변경 · 보유한 휠로 장착'};
}
