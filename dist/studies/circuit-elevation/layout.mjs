import {DATA} from './data.mjs';
export const PIT_LAYOUTS=Object.freeze({
 spacious:Object.freeze({id:'spacious',label:'이전 배치',centerX:38,halfWidth:6,separatorX:16,front:58,depth:32,start:270,end:430,height:6,bayPitch:16,doorWidth:12,doorHeight:4.1}),
 compact:Object.freeze({id:'compact',label:'간격·정비동 조정안',centerX:20,halfWidth:6,separatorX:11,front:32,depth:18,start:300,end:380,height:4.5,bayPitch:8,doorWidth:6,doorHeight:3.2})
});
export function pitLayout(id='spacious'){if(!PIT_LAYOUTS[id])throw Error('Unknown pit layout: '+id);return PIT_LAYOUTS[id];}
export function campusFacilities(layout){return DATA.campus.facilities.map(f=>f.id==='pit'?{...f,box:[layout.start,-(layout.front+layout.depth),layout.end,-layout.front]}:f);}
export function layoutMeasurements(layout){return{id:layout.id,label:layout.label,trackWidth:16.4,pitWidth:layout.halfWidth*2,trackPitGap:layout.centerX-layout.halfWidth-8.2,apron:layout.front-layout.centerX-layout.halfWidth,buildingLength:layout.end-layout.start,buildingDepth:layout.depth,buildingHeight:layout.height,doorWidth:layout.doorWidth,doorHeight:layout.doorHeight};}
