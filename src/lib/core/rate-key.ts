/** A single per-user quota per route, avoiding duplicate Firestore transactions. */
export function userRateKey(route:string,uid:string):string{
 return route.replaceAll('{uid}',uid).replaceAll('{ip}','user');
}
export function ipRateKey(route:string,ip:string):string{
 return 'ip:'+ip+':'+route.replaceAll('{uid}','shared').replaceAll('{ip}','shared');
}
