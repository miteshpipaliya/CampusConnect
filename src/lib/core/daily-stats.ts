export type DailyStat={day:string;profileVisits:number;reach:number;storyViews:number;views:number};
export function utcDay(ms:number):string{return new Date(ms).toISOString().slice(0,10)}
export function dayDocId(uid:string,day:string):string{return uid+'_'+day.replaceAll('-','')}
export function zeroFilledSeries(range:7|30,nowMs:number,stored:Record<string,Partial<DailyStat>>):DailyStat[]{
 const base=new Date(nowMs),out:DailyStat[]=[];
 for(let index=range-1;index>=0;index--){
  const value=Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate()-index);
  const day=utcDay(value),s=stored[day]||{};
  out.push({day,profileVisits:Math.max(0,Number(s.profileVisits||0)),reach:Math.max(0,Number(s.reach||0)),
   storyViews:Math.max(0,Number(s.storyViews||0)),views:Math.max(0,Number(s.views||0))});
 }
 return out;
}
