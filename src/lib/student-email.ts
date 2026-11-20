export const proposedCodes={cp:'Computer',el:'Electrical',ec:'Electronics & Communication',it:'Information Technology',me:'Mechanical',cl:'Civil',ee:'Electronics',pr:'Production'} as const;
export type BranchCode=keyof typeof proposedCodes;
export const degreeCourses={
 BTech:['Civil Engineering','Computer Engineering','Electrical Engineering','Electronics Engineering','Mechanical Engineering','Production Engineering','Information Technology','Electronics & Communication Engineering'],
 MTech:['Environmental Engineering','Construction Engineering and Management','Structural Engineering','Transportation Engineering','Computer Engineering (Software Engineering)','Electrical Engineering','Machine Design','Infrastructure Engineering and Technology','Automation and Robotics']
} as const;
const aliases:Record<BranchCode,string[]>={
 cp:['computer','computer engineering'],el:['electrical','electrical engineering'],
 ec:['electronics & communication','electronics and communication','electronics and communication engineering','electronics & communication engineering','ece'],
 it:['information technology','it'],me:['mechanical','mechanical engineering'],
 cl:['civil','civil engineering'],ee:['electronics','electronics engineering'],
 pr:['production','production engineering']
};
export type EmailCheck={ok:true;normalized:string;year:number;code:BranchCode;studentIdentifier:string}|{ok:false;reason:string};
/** Provisional email convention, not an officially verified college roster. */
export function checkStudentEmail(value:string,branch:string,nowYear=2026,enrollmentNumber?:string,degree:'BTech'|'MTech'='BTech'):EmailCheck{
 const normalized=value.trim().toLowerCase();
 const m=/^(\d{2})([a-z]{2})(\d{3,8})@bvmengineering\.ac\.in$/.exec(normalized);
 if(!m)return {ok:false,reason:'Use a BVM email in YY + branch code + student ID format'};
 const year=2000+Number(m[1]);
 if(year<2020||year>nowYear+1)return {ok:false,reason:'Invalid admission year'};
 const code=m[2] as BranchCode;
 if(!Object.prototype.hasOwnProperty.call(proposedCodes,code))return {ok:false,reason:'Branch code is not configured'};
 const normalizedBranch=branch.trim().toLowerCase().replace(/\s+/g,' ');
 const courseDepartment:Record<string,BranchCode>={'environmental engineering':'cl','construction engineering and management':'cl','structural engineering':'cl','transportation engineering':'cl','infrastructure engineering and technology':'cl','computer engineering (software engineering)':'cp','machine design':'me','automation and robotics':'me'};
 if(!degreeCourses[degree].some(c=>c.toLowerCase()===normalizedBranch))return {ok:false,reason:'Select a valid BVM programme'};
 if(enrollmentNumber!==undefined&&enrollmentNumber.trim().toLowerCase()!==`${m[1]!}${m[2]!}${m[3]!}`)return {ok:false,reason:'Enrollment number must exactly match the part of your BVM email before @'};
 if(degree==='MTech'){
  const expected=courseDepartment[normalizedBranch]||Object.entries(aliases).find(([,names])=>names.includes(normalizedBranch))?.[0];
  if(expected!==code)return {ok:false,reason:'Email code does not match the selected M.Tech department (provisional mapping)'};
  return {ok:true,normalized,year,code,studentIdentifier:m[3]!};
 }
 if(!aliases[code].includes(normalizedBranch))return {ok:false,reason:'Email branch code does not match selected branch'};
 return {ok:true,normalized,year,code,studentIdentifier:m[3]!};
}
export const relationshipStatuses=['Single','In Relationship','Engaged','Married','Situationship'] as const;
export const relationshipVisibilities=['campus','followers','me'] as const;
