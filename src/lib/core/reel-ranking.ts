export function reelScore(input:{likes:number;comments:number;views:number;createdAt:number},nowMs:number){
 const ageHours=Math.max(0,(nowMs-input.createdAt)/3600000);
 const engagement=Math.log1p(Math.max(0,input.likes)*2+Math.max(0,input.comments)*3+Math.max(0,input.views)*.1);
 return engagement/(1+ageHours/48);
}
