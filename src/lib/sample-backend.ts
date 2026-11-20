export type SampleProfile = {handle:string;name:string;bio:string;branch:string;division:string;year:number;private:boolean;avatar:string;posts:number};
export const profiles:readonly SampleProfile[]=[
{handle:'mitesh.pipaliya',name:'Campus Demo You',bio:'Making memories on campus ✨',branch:'Computer Engineering',division:'4',year:3,private:false,avatar:'CY',posts:3},
{handle:'aarav.codes',name:'Aarav Patel',bio:'Building apps and drinking chai ☕',branch:'Computer Engineering',division:'4',year:3,private:false,avatar:'AP',posts:6},
{handle:'diyashah',name:'Diya Shah',bio:'Books, photos and big dreams 📚',branch:'Information Technology',division:'2',year:2,private:false,avatar:'DS',posts:8},
{handle:'rohanbuilds',name:'Rohan Mehta',bio:'Robotics and electronics ⚡',branch:'Electronics Engineering',division:'1',year:4,private:false,avatar:'RM',posts:4},
{handle:'nishak',name:'Nisha Kulkarni',bio:'Finding joy in the little things 🌿',branch:'Mechanical Engineering',division:'4',year:3,private:false,avatar:'NK',posts:7},
{handle:'ishita.designs',name:'Ishita Desai',bio:'Design is how it works 🎨',branch:'Computer Engineering',division:'4',year:3,private:false,avatar:'ID',posts:9},
{handle:'karan.ai',name:'Karan Joshi',bio:'Curious about machine learning 🧠',branch:'Information Technology',division:'2',year:2,private:true,avatar:'KJ',posts:2},
{handle:'mirabuilds',name:'Mira Shah',bio:'Tiny chips, big ideas',branch:'Electronics Engineering',division:'1',year:4,private:false,avatar:'MS',posts:5},
{handle:'devpatel',name:'Dev Patel',bio:'Typescript and campus hacks',branch:'Computer Engineering',division:'4',year:1,private:false,avatar:'DP',posts:4},
{handle:'ananya.creates',name:'Ananya Desai',bio:'Frames from college life 📸',branch:'Computer Engineering',division:'2',year:2,private:true,avatar:'AD',posts:11}
];
export const relationships:Readonly<Record<string,readonly string[]>>={
'mitesh.pipaliya':['aarav.codes','ishita.designs','mirabuilds','devpatel'],
'aarav.codes':['mitesh.pipaliya','ishita.designs','diyashah','devpatel'],
'diyashah':['aarav.codes','nishak','ananya.creates'],
'rohanbuilds':['mirabuilds','nishak'],
'nishak':['diyashah','rohanbuilds','ananya.creates'],
'ishita.designs':['mitesh.pipaliya','aarav.codes','devpatel','ananya.creates'],
'karan.ai':['diyashah','rohanbuilds'],
'mirabuilds':['mitesh.pipaliya','rohanbuilds','ishita.designs'],
'devpatel':['mitesh.pipaliya','aarav.codes','ishita.designs'],
'ananya.creates':['diyashah','nishak','ishita.designs']
};
export const validHandle=(s:string)=>/^[a-z0-9][a-z0-9._]{0,29}$/.test(s);
export function getProfile(handle:string){return profiles.find(p=>p.handle===handle)}
export function getFollowing(handle:string){return (relationships[handle]||[]).map(h=>getProfile(h)).filter((p):p is SampleProfile=>Boolean(p))}
export function getFollowers(handle:string){return profiles.filter(p=>(relationships[p.handle]||[]).includes(handle))}
export function searchProfiles(q:string,branch:string,division:string){const text=q.trim().toLowerCase();return profiles.filter(p=>(!text||(p.name+' '+p.handle+' '+p.bio).toLowerCase().includes(text))&&(!branch||p.branch.toLowerCase()===branch.toLowerCase())&&(!division||p.division.toLowerCase()===division.toLowerCase()))}
