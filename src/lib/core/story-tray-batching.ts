/** Select chunk sizes safely within Firestore's 30-value IN query limit. */
export function chunkAudienceIds(ids:string[],size=30):string[][]{
 const unique=[...new Set(ids.filter(Boolean))];
 // Explicit loop avoids accidental empty query chunks.
 const out:string[][]=[];
 const take=Math.max(1,Math.min(30,Math.floor(size)||30));
 for(let i=0;i<unique.length;i+=take)out.push(unique.slice(i,i+take));
 return out;
}
/** Merge repeated result pages without losing story documents. */
export function uniqueStoryDocs<T extends {id:string}>(docs:T[]):T[]{
 return [...new Map(docs.map(doc=>[doc.id,doc])).values()];
}
