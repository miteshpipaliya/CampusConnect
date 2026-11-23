export function exploreScore(entry:{likes?:number;comments?:number;reposts?:number;saves?:number;createdAt?:number;mutual?:number},now:number):number{
 const engagement=Math.log1p(Math.max(0,entry.likes||0)*2+Math.max(0,entry.comments||0)*3+Math.max(0,entry.reposts||0)*3+Math.max(0,entry.saves||0)*2);
 const age=Math.max(0,(now-(entry.createdAt||now))/86400000);
 return (engagement+Math.max(0,entry.mutual||0)*.3)/(1+age/5);
}
