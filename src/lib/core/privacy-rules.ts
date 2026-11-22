export type PrivacyFacts={self:boolean;blocked:boolean;privateAccount:boolean;following:boolean};
export function canViewFromFacts(facts:PrivacyFacts){return facts.self||(!facts.blocked&&(!facts.privateAccount||facts.following))}
export function followDecision(facts:{self:boolean;blocked:boolean;privateAccount:boolean;existing:'active'|'pending'|null}):'forbidden'|'active'|'pending'|'unchanged'{
 if(facts.self||facts.blocked)return 'forbidden';
 if(facts.existing)return 'unchanged';
 return facts.privateAccount?'pending':'active';
}
