export const ADMIN_ACTIONS=['dismiss','remove-content','disable-account'] as const;
export type AdminAction=typeof ADMIN_ACTIONS[number];
export function mayModerate(action:AdminAction,type:string):boolean{
 if(action==='dismiss')return true;
 if(action==='disable-account')return type==='user';
 return type==='post'||type==='story'||type==='comment';
}
