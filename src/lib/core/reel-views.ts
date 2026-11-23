export function eligibleReelView(watchMs:number):boolean{return Number.isInteger(watchMs)&&watchMs>=3000&&watchMs<=3600000}
export function dedupeReels<T extends {id:string}>(old:T[],incoming:T[]):T[]{return [...new Map([...old,...incoming].map(x=>[x.id,x])).values()]}
