export function nextDelay(previous:number,hadNewData:boolean,hidden:boolean):number|null{if(hidden)return null;if(hadNewData)return 4000;return Math.min(30000,Math.max(4000,previous*2))}
