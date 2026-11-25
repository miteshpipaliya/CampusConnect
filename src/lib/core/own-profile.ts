const fields=['handle','name','bio','website','branch','division','degree','avatarMediaId','privacy','isPrivate','relationshipStatus','relationshipVisibility','createdAt','verifiedInstitutionalEmail','verified'] as const;
const counterFields=['posts','followers','following','likes','reels','stories','reposts'] as const;
export function ownProfileView(data:Record<string,unknown>|undefined):Record<string,unknown>|null{
 if(!data)return null;const out:Record<string,unknown>={};for(const key of fields)if(Object.hasOwn(data,key))out[key]=data[key];
 if(data.counters&&typeof data.counters==='object'){const counters=data.counters as Record<string,unknown>;out.counters=Object.fromEntries(counterFields.filter(k=>typeof counters[k]==='number').map(k=>[k,counters[k]]))}
 if(data.settings&&typeof data.settings==='object'){const settings=data.settings as Record<string,unknown>;const allowed=Object.fromEntries(['theme','isPrivate','activityStatus','storyReplies','storySharing','showActivity','readReceipts'].filter(k=>typeof settings[k]==='boolean'||typeof settings[k]==='string').map(k=>[k,settings[k]]));if(settings.notifications&&typeof settings.notifications==='object'){const n=settings.notifications as Record<string,unknown>;allowed.notifications=Object.fromEntries(['likes','comments','follows','messages','mentions','reposts','stories','shares'].filter(k=>typeof n[k]==='boolean').map(k=>[k,n[k]]))}out.settings=allowed}
 return out;
}
