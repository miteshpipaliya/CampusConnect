export const queryKeys={posts:['posts'] as const,stories:['stories'] as const,reels:['reels'] as const,profile:(handle:string)=>['profile',handle] as const} as const;

export function userKey(uid:string|null,...parts:readonly (string|number)[]){return ['account',uid,...parts] as const}
