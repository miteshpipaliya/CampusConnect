import {validExploreIds} from '../core/explore-neighbors';
const key=(uid:string)=>'cc:explore:ids:'+uid;
export function rememberExploreIds(uid:string|null,ids:string[]){if(!uid)return;try{sessionStorage.setItem(key(uid),JSON.stringify(validExploreIds(ids)))}catch{}}
export function exploreIds(uid:string|null):string[]{if(!uid)return [];try{return validExploreIds(JSON.parse(sessionStorage.getItem(key(uid))||'[]'))}catch{return []}}
