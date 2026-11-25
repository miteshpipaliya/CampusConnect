export const AUTH_LIMITS={loginPassword:{ip:{limit:10,windowSec:900},email:{limit:5,windowSec:900}},requestOtp:{ip:{limit:10,windowSec:3600}},verifyOtp:{ip:{limit:20,windowSec:3600}},finishOtp:{ip:{limit:10,windowSec:3600}}} as const;
export type AuthAction=keyof typeof AUTH_LIMITS;
export function normalizeEmail(value:string){return value.trim().toLowerCase()}
export function authRateKey(action:AuthAction,scope:'ip'|'email',digest:string){return 'auth:'+action+':'+scope+':'+digest}
export function failClosedAfter(errors:number,threshold=3){return errors>=threshold}
