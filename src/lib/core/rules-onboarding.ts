export const RULES_VERSION='rules-v4';
export const RULES_AUDIO=[
 {name:'rules_Declar',label:'INTRODUCTION',title:'Three rules. One community.',duration:23.248938,sha256:'1c481c250d031deccf0398b5de09658bc5109ce3cc6d3a5557053e858c69bbb0'},
 {name:'rule_one',label:'RULE 01',title:'Respect personal space and boundaries',duration:52.192625,sha256:'5ce8eba38bb7c18d35948a7619c266881218b3497a337edb7a4fe06fd271f871'},
 {name:'rule_two',label:'RULE 02',title:'Respect everyone',duration:48.927313,sha256:'9c58f35707a5dc048ab22d4d5d34964e98e8f80107e712956be4dcf6fad7c1c3'},
 {name:'rule_thee',label:'RULE 03',title:'Spread the community',duration:56.267750,sha256:'99210213c1c2e0d8727a489838f3a4c7ad5783ff817ca49d8de22497ead227ac'},
 {name:'reffer-clng',label:'REFERRAL CHALLENGE',title:'CampusConnect 30-day referral challenge',duration:133.485688,sha256:'e5475fd0d4556a25e57814b714c82d504440183226c767d1a334359d939802c5'}
] as const;
export type RulesWord={word:string;start:number;end:number};
export type GiftCue={rank:number;start:number};
export type RulesCaption={name:string;duration:number;sha256:string;words:RulesWord[];gifts?:GiftCue[]};
export type RulesState={version:string;next:number;startedAt?:number;stepStartedAt?:number;attempt?:string;completedAt?:number};
export function pendingRules(data:Record<string,unknown>|undefined){const r=data?.rulesOnboarding as RulesState|undefined;return !(r?.version===RULES_VERSION&&typeof r.completedAt==='number'&&r.next===RULES_AUDIO.length)}
export function rulesStatus(data:Record<string,unknown>|undefined){const r=data?.rulesOnboarding as RulesState|undefined;return pendingRules(data)?{required:true,step:r?.version===RULES_VERSION?r.next:0}:{required:false,step:RULES_AUDIO.length}}
export function advanceRules(state:RulesState,action:'start'|'finish'|'complete',step:number,attempt:string,now:number):RulesState{
 if(state.version!==RULES_VERSION||!Number.isInteger(state.next)||state.next<0||state.next>RULES_AUDIO.length)throw Error('Invalid onboarding state');
 if(state.completedAt!==undefined)return state;
 if(action==='complete'){if(state.next!==RULES_AUDIO.length)throw Error('Finish all recordings first');return {...state,completedAt:now}}
 if(action==='finish'&&step<state.next)return state;
 const clip=RULES_AUDIO[step];if(!clip||state.next!==step)throw Error('Recording sequence changed. Reload to resume.');
 if(action==='start'){if(state.attempt===attempt&&state.stepStartedAt!==undefined)return state;return {...state,startedAt:state.startedAt??now,stepStartedAt:now,attempt}}
 if(state.attempt!==attempt||state.stepStartedAt===undefined)throw Error('Playback session changed. Restart this recording.');
 if(now-state.stepStartedAt<Math.floor(clip.duration*1000)-250)throw Error('Recording has not finished yet');
 const {stepStartedAt:unusedStart,attempt:unusedAttempt,...rest}=state;void unusedStart;void unusedAttempt;return {...rest,next:step+1};
}
export function currentWord(words:RulesWord[],time:number){let lo=0,hi=words.length;while(lo<hi){const mid=(lo+hi)>>>1;if(words[mid]!.start<=time)lo=mid+1;else hi=mid}return lo-1}
export function currentGift(gifts:GiftCue[],time:number){return gifts.reduce((rank,g)=>time>=g.start?g.rank:rank,0)}
export function validateRulesCaptions(raw:unknown):raw is RulesCaption[]{if(!Array.isArray(raw)||raw.length!==RULES_AUDIO.length)return false;return raw.every((c,i)=>{const a=RULES_AUDIO[i]!;if(c?.name!==a.name||c.sha256!==a.sha256||c.duration!==a.duration||!Array.isArray(c.words)||!c.words.length)return false;let last=0;for(const w of c.words){if(typeof w.word!=='string'||!w.word.trim()||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<last||w.end<w.start||w.end>a.duration+.05)return false;last=w.start}return i!==4||(Array.isArray(c.gifts)&&c.gifts.length===5&&c.gifts.every((g:GiftCue,j:number)=>g.rank===j+1&&Number.isFinite(g.start)&&g.start>=0&&g.start<a.duration&&(j===0||g.start>c.gifts[j-1].start)))})}
