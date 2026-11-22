/** Activity status is opt-in per viewer relationship and cannot be inferred from profile visits. */
export function mayShowActivity(input:{viewerUid:string;targetUid:string;targetEnabled:boolean;viewerEnabled:boolean;blocked:boolean;targetDeleted:boolean}):boolean{
 return Boolean(input.viewerUid&&input.targetUid&&input.viewerUid!==input.targetUid&&input.targetEnabled&&input.viewerEnabled&&!input.blocked&&!input.targetDeleted);
}
export function streamPresenceState(input:{allowed:boolean;online?:boolean|null;connected?:boolean}):boolean{
 return input.allowed&&input.connected!==false&&input.online===true;
}
