import {CARS,CATEGORIES,itemById} from './garage-core.mjs?v=city-tour-1';
import {SAVE_KEY,BACKUP_KEY,MAX_TRANSFER_BYTES,createTransfer,readSnapshot,prepareImport,applyImport,prepareRestore,applyRestore} from './save-transfer.mjs?v=city-tour-1';

import {CAR_NAMES as carNames,presentItem} from './vehicle-presentation.mjs?v=ferrari-main-1';
const amount=value=>value.toLocaleString('ko-KR')+' C';
const time=value=>Number.isFinite(value)?Math.floor(value/60)+':'+(value%60).toFixed(2).padStart(5,'0'):'아직 없어요';
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function saveCard(save,title){
 const card=el('section',undefined,'transfer-record');card.append(el('h4',title));
 if(!save){card.append(el('p','현재 기록을 읽지 못했어요. 가져오기를 적용하면 원문을 자동 백업해 두고 파일의 기록으로 바꿉니다.'));return card;}
 card.append(el('strong',amount(save.coins),'transfer-coins'));
 const paid=save.owned.map(itemById).filter(item=>item?.price>0);
 card.append(el('p','완주 '+save.races.toLocaleString('ko-KR')+'회 · 구매한 물건 '+paid.length+'개','transfer-small'));
 card.append(el('p',paid.length?paid.map(item=>item.name).join(' · '):'구매한 물건이 아직 없어요.','transfer-owned'));
 for(const car of CARS){
  const section=el('div',undefined,'transfer-car');section.append(el('h5',carNames[car]));
  const dl=el('dl');
  for(const [category,label] of Object.entries(CATEGORIES)){dl.append(el('dt',label),el('dd',presentItem(itemById(save.garage[car][category]),car)?.name||'알 수 없음'));}
  dl.append(el('dt','이전 코스 최고'),el('dd',time(save.best[car])),el('dt','시티 투어 최고'),el('dd',time(save.courseBest?.['bayfront-long-1']?.[car])));section.append(dl);card.append(section);
 }
 const settings=el('p','선택 차량 '+carNames[save.car]+' · '+(save.view==='cockpit'?'운전석 시점':'차 뒤 시점')+' · 운전 보조 '+(save.assist?'켜짐':'꺼짐')+' · 자동 가속 '+(save.auto?'켜짐':'꺼짐'),'transfer-small');card.append(settings);return card;
}

export function installSaveTransfer({getSave,onSaveChanged=()=>{}}){
 const $=id=>document.getElementById(id),dialog=$('save-transfer');
 if(!dialog)throw new Error('저장 이동 화면이 없습니다.');
 let pending=null,fileGeneration=0,busy=false,lastTrigger=null;
 const fileInput=$('transfer-file'),applyButton=$('transfer-apply'),cancelButton=$('transfer-cancel');
 function storage(){return window.localStorage;}
 function notice(message,error=false){const node=$('transfer-status');node.textContent=message;node.dataset.kind=error?'error':'info';}
 function clearPreview({clearFile=false}={}){fileGeneration++;pending=null;$('transfer-preview').replaceChildren();$('transfer-preview').hidden=true;$('transfer-preview-note').hidden=true;applyButton.hidden=true;applyButton.disabled=true;cancelButton.hidden=true;if(clearFile)fileInput.value='';}
 function setBusy(value){busy=value;dialog.setAttribute('aria-busy',String(value));fileInput.disabled=value;$('transfer-export').disabled=value;$('transfer-restore').disabled=value;applyButton.disabled=value||!pending;cancelButton.disabled=value;}
 function refresh(){
  try{
   const snapshot=readSnapshot(storage());
   $('transfer-current').textContent=snapshot.invalid?'현재 저장 파일을 읽지 못했어요. 원래 기록을 먼저 확인해 주세요.':'이 주소의 기록 · '+amount(snapshot.save.coins)+' · 완주 '+snapshot.save.races.toLocaleString('ko-KR')+'회';
   $('transfer-export').disabled=snapshot.invalid||busy;
   const hasBackup=storage().getItem(BACKUP_KEY)!==null;
   $('transfer-backup').hidden=!hasBackup;
   $('transfer-restore').disabled=busy;
   return snapshot;
  }catch(error){$('transfer-current').textContent='이 브라우저의 저장 기록에 접근할 수 없어요.';$('transfer-export').disabled=true;$('transfer-backup').hidden=true;notice(error.message||'저장 권한을 확인한 뒤 다시 열어 주세요.',true);return null;}
 }
 function showPreview(prepared){
  pending=prepared;
  const restore=prepared.kind==='restore',preview=$('transfer-preview');preview.replaceChildren();
  preview.append(saveCard(prepared.current.save,'지금 이 주소의 기록'),saveCard(prepared.save,restore?'되돌릴 기록':'불러올 파일의 기록'));
  preview.hidden=false;
  $('transfer-preview-note').hidden=false;
  $('transfer-preview-note').textContent=restore?'지금 기록을 가져오기 전 기록으로 바꿉니다. 두 기록을 더하거나 합치지 않아요.':'파일의 기록으로 현재 기록을 바꿉니다. 상금과 물건을 더하거나 합치지 않아요. 현재 기록은 적용 전에 자동 백업합니다.';
  applyButton.textContent=restore?'이전 기록으로 되돌리기':'이 기록으로 바꾸기';applyButton.hidden=false;applyButton.disabled=false;cancelButton.hidden=false;
  notice(restore?'되돌릴 내용을 확인한 뒤 아래 버튼을 눌러 주세요.':'파일을 확인했어요. 아직 기록을 바꾸지 않았습니다.');
  preview.scrollIntoView({block:'start',behavior:'instant'});
 }
 function open(event){lastTrigger=event?.currentTarget||document.activeElement;clearPreview({clearFile:true});notice('상금·구매한 물건·꾸미기·최고 기록을 함께 옮겨요.');refresh();if(!dialog.open)dialog.showModal();$('transfer-close').focus();}
 function close(){if(busy)return;dialog.close();}
 document.querySelectorAll('[data-save-transfer-open]').forEach(button=>button.addEventListener('click',open));
 $('transfer-close').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('close',()=>{clearPreview({clearFile:true});if(lastTrigger?.isConnected)lastTrigger.focus();});
 cancelButton.addEventListener('click',()=>{if(busy)return;clearPreview({clearFile:true});notice('불러오기를 취소했어요. 현재 기록은 그대로입니다.');});
 fileInput.addEventListener('click',()=>{if(busy)return;clearPreview({clearFile:true});notice('옮길 저장 파일을 선택해 주세요.');});
 fileInput.addEventListener('cancel',()=>{if(busy)return;clearPreview({clearFile:true});notice('파일 선택을 취소했어요. 현재 기록은 그대로입니다.');});
 fileInput.addEventListener('change',async()=>{
  if(busy)return;clearPreview();const request=fileGeneration,file=fileInput.files?.[0];if(!file){notice('선택한 파일이 없어요.');return;}
  try{
   if(file.size>MAX_TRANSFER_BYTES)throw new Error('파일이 너무 커요. 드림 개러지에서 내려받은 저장 파일을 골라 주세요.');
   notice('파일을 확인하고 있어요…');const text=await file.text();
   if(request!==fileGeneration||!dialog.open)return;
   const prepared=prepareImport(storage(),text);showPreview(prepared);
  }catch(error){if(request!==fileGeneration||!dialog.open)return;clearPreview();notice(error.message||'파일을 읽지 못했어요. 저장 파일을 다시 골라 주세요.',true);}
 });
 $('transfer-export').addEventListener('click',()=>{
  if(busy)return;
  try{
   const current=readSnapshot(storage());if(current.invalid)throw new Error('현재 저장 기록이 손상되어 있어요. 이 상태를 새 기록으로 내보내지 않았습니다.');
   const text=createTransfer(current.save);const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
   const link=el('a');link.href=url;link.download='dream-garage-save-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   notice('파일 저장을 요청했어요. 파일을 보관한 뒤 새 게임에서 불러와 주세요.');
  }catch(error){notice(error.message||'파일을 만들지 못했어요. 다시 시도해 주세요.',true);}
 });
 $('transfer-restore').addEventListener('click',()=>{if(busy)return;clearPreview({clearFile:true});try{showPreview(prepareRestore(storage()));}catch(error){notice(error.message||'이전 기록을 불러올 수 없어요.',true);}});
 applyButton.addEventListener('click',()=>{
  if(busy||!pending)return;const prepared=pending;setBusy(true);
  try{
   const result=prepared.kind==='restore'?applyRestore(storage(),prepared):applyImport(storage(),prepared);
   clearPreview({clearFile:true});
   try{onSaveChanged(result.save);}catch{refresh();notice('기록은 저장했어요. 새로고침하면 옮긴 기록으로 열립니다.');return;}
   refresh();
   notice(result.unchanged?'이미 같은 기록이에요. 상금과 물건을 중복해서 더하지 않았습니다.':prepared.kind==='restore'?'가져오기 전 기록으로 되돌렸어요. 차고에서 확인해 보세요.':'기록을 옮겼어요! 차고에서 상금과 꾸미기를 확인해 보세요.');
   $('transfer-status').focus();
  }catch(error){clearPreview({clearFile:true});refresh();notice(error.message||'기록을 바꾸지 못했어요. 현재 기록을 확인해 주세요.',true);$('transfer-status').focus();}
  finally{setBusy(false);refresh();}
 });
 addEventListener('storage',event=>{if(event.key!==SAVE_KEY&&event.key!==BACKUP_KEY)return;if(!dialog.open)return;const hadPreview=!!pending;clearPreview({clearFile:true});refresh();if(hadPreview)notice('다른 창에서 기록이 바뀌었어요. 옮길 파일을 다시 골라 내용을 확인해 주세요.',true);});
 return {open,close,refresh};
}
