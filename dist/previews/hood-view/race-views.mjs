export const viewNames = Object.freeze({hood:'보닛', cockpit:'운전석', chase:'차 뒤'});
export const isRaceView = value => Object.hasOwn(viewNames, value);
export function nextView(view) {
  return view === 'chase' ? 'hood' : view === 'hood' ? 'cockpit' : 'chase';
}
