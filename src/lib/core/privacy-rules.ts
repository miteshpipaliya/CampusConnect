export type PrivacyFacts={self:boolean;blocked:boolean;privateAccount:boolean;activeFollower:boolean};
export function canViewPrivacy(facts:PrivacyFacts):boolean{
 if(facts.self)return true;
 if(facts.blocked)return false;
 return !facts.privateAccount||facts.activeFollower;
}
export function followAction(facts:{self:boolean;blocked:boolean;privateAccount:boolean;existing:'none'|'pending'|'active'}):'forbidden'|'pending'|'active'|'unchanged'{
 if(facts.self||facts.blocked)return 'forbidden';
 if(facts.existing!=='none')return 'unchanged';
 return facts.privateAccount?'pending':'active';
}
