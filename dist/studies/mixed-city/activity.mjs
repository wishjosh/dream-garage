// A touch browser can lose focus while the play page is still visible.
// Held input is released on every blur; only an actual background transition
// pauses touch play. Desktop window switching retains pause-on-blur.
export function installPageActivity({scope=window,root=document,onRelease=()=>{},onSuspend=()=>{}}={}){
 const blur=()=>{onRelease();const touch=scope.matchMedia?.('(hover: none) and (pointer: coarse)').matches===true;if(root.hidden||!touch)onSuspend('window-blur');};
 const visibility=()=>{if(root.hidden){onRelease();onSuspend('document-hidden');}};
 const pagehide=()=>{onRelease();onSuspend('page-hidden');};
 scope.addEventListener('blur',blur);root.addEventListener('visibilitychange',visibility);scope.addEventListener('pagehide',pagehide);
 return{dispose(){scope.removeEventListener('blur',blur);root.removeEventListener('visibilitychange',visibility);scope.removeEventListener('pagehide',pagehide);}};
}
