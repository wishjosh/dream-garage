// Fit actual glyph bounds without squeezing digits horizontally. No webfont download.
export function paintDistanceBoard(ctx,text,width,height){
 const digits=['150','100','50'];
 if(!digits.includes(text))throw Error('Unknown distance board');
 let size=height;
 const measure=()=>digits.map(value=>ctx.measureText(value));
 for(let i=0;i<3;i++){
  ctx.font=`900 ${size}px "Arial Black", Arial, sans-serif`;
  const metrics=measure(),inkWidth=Math.max(...metrics.map(m=>m.actualBoundingBoxLeft+m.actualBoundingBoxRight)),inkHeight=Math.max(...metrics.map(m=>m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));
  size*=Math.min(width*.88/inkWidth,height*.80/inkHeight,1);
 }
 ctx.font=`900 ${size}px "Arial Black", Arial, sans-serif`;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
 ctx.strokeStyle='#000000';ctx.lineWidth=Math.max(4,width*.012);ctx.strokeRect(ctx.lineWidth,ctx.lineWidth,width-2*ctx.lineWidth,height-2*ctx.lineWidth);
 ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#000000';
 const m=ctx.measureText(text),x=(width-m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2+m.actualBoundingBoxLeft,y=(height-m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2+m.actualBoundingBoxAscent;
 ctx.fillText(text,x,y);
 return {fontSize:size,inkWidth:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,inkHeight:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};
}
