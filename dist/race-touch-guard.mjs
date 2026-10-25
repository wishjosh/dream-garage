// Protect the active play surface without interfering with file inputs or menus.
export function installRaceTouchGuard({isPlaying,root=document}){
 const listeners=[],on=(name,fn)=>{root.addEventListener(name,fn,{capture:true});listeners.push([name,fn]);};
 const clear=()=>{if(!isPlaying())return;const selection=root.defaultView?.getSelection?.();if(selection&&!selection.isCollapsed)selection.removeAllRanges();};
 for(const name of ['selectstart','contextmenu','dragstart'])on(name,event=>{if(isPlaying()){event.preventDefault();clear();}});
 on('pointerdown',clear);on('selectionchange',clear);
 return{dispose(){for(const[name,fn]of listeners)root.removeEventListener(name,fn,{capture:true});}};
}
