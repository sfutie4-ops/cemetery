const DPI=96;
export const letterMargin=0.375;
export function letterPage(landscape=false){
  const width=(landscape?11:8.5)*DPI,height=(landscape?8.5:11)*DPI,margin=letterMargin*DPI;
  return {width,height,margin,contentWidth:width-2*margin,contentHeight:height-2*margin};
}
export function fitScale(width:number,height:number,availableWidth:number,availableHeight:number){
  return Math.min(1,Math.max(1,availableWidth)/width,Math.max(1,availableHeight)/height);
}
export type PaperRule={id:string;left:number;top:number;width:number;height?:number;double?:boolean;thick?:boolean};
