export const INTRO_VERSION='v1';
export const INTRO_AUDIO='/audio/introduction.mp3';
export const INTRO_DURATION=102.687313;
export const INTRO_SHA256='71ff44812cbf6ef5559adfa18bd4bed28c5174b9b306f116f25a48a09ccd483c';
export type IntroWord={word:string;start:number;end:number};
export function validateTimings(value:unknown):IntroWord[]|null{
 if(!value||typeof value!=='object')return null;
 const d=value as {audio?:unknown;duration?:unknown;sha256?:unknown;words?:unknown};
 if(d.audio!==INTRO_AUDIO||d.sha256!==INTRO_SHA256||typeof d.duration!=='number'||Math.abs(d.duration-INTRO_DURATION)>.1||!Array.isArray(d.words)||!d.words.length)return null;
 let previous=-1;const words:IntroWord[]=[];
 for(const item of d.words){if(!item||typeof item.word!=='string'||!item.word.trim()||typeof item.start!=='number'||typeof item.end!=='number'||!Number.isFinite(item.start)||!Number.isFinite(item.end)||item.start<0||item.start<previous||item.end<item.start||item.end>INTRO_DURATION+.25)return null;previous=item.start;words.push({word:item.word,start:item.start,end:item.end})}
 return words;
}
export function visibleWordCount(words:readonly IntroWord[],time:number){let lo=0,hi=words.length;while(lo<hi){const mid=(lo+hi)>>>1;if(words[mid]!.start<=time)lo=mid+1;else hi=mid}return lo}
