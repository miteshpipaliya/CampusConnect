const fields=['handle','name','bio','website','branch','division','degree','avatarMediaId','privacy','isPrivate','relationshipStatus','relationshipVisibility','createdAt','verifiedInstitutionalEmail','verified'] as const;
const counterFields=['posts','followers','following','likes','reels','stories'] as const;
export function ownProfileView(data:Record<string,unknown>|undefined):Record<string,unknown>|null{
 if(!data)return null;const out:Record<string,unknown>={};for(const key of fields)if(Object.hasOwn(data,key))out[key]=data[key];
 if(data.counters&&typeof data.counters==='object'){const counters=data.counters as Record<string,unknown>;out.counters=Object.fromEntries(counterFields.filter(k=>typeof counters[k]==='number').map(k=>[k,counters[k]]))}
 if(data.settings&&typeof data.settings==='object'){const settings=data.settings as Record<string,unknown>;out.settings=Object.fromEntries(['theme','notifications','showActivity','readReceipts'].filter(k=>typeof settings[k]==='boolean'||typeof settings[k]==='string').map(k=>[k,settings[k]]))}
 return out;
}
