export const LEVELS = {
  rookie: {name:'입문', straight:31, corner:4.6, deceleration:4.3, margin:6, reaction:.47, look:.60},
  club:   {name:'클럽', straight:40, corner:6.2, deceleration:5.9, margin:4, reaction:.32, look:.51},
  pro:    {name:'프로', straight:48, corner:7.8, deceleration:7.2, margin:3, reaction:.24, look:.46}
};
export const DEFAULT_LEVEL = 'club';
const preference = 'dream-garage:opponent-difficulty:v1';
export function readDifficulty(){
  try {const value=localStorage.getItem(preference);return Object.hasOwn(LEVELS,value)?value:DEFAULT_LEVEL;}
  catch {return DEFAULT_LEVEL;}
}
export function rememberDifficulty(key){
  if(Object.hasOwn(LEVELS,key))try{localStorage.setItem(preference,key);}catch{}
}
