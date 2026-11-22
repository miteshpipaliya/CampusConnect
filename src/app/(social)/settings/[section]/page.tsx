import Link from 'next/link';
import {ProfileSettings} from '@/components/profile-settings';
import {AccountPreferences} from '@/components/account-preferences';
const sections=['edit-profile','notifications','account-privacy','appearance'] as const;
export default async function SettingsSection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 return <section style={{display:'grid',gridTemplateColumns:'minmax(160px,220px) minmax(0,1fr)',gap:24,maxWidth:1100,margin:'0 auto',padding:20}}>
 <nav aria-label="Settings sections" style={{display:'grid',gap:12,alignContent:'start'}}>{sections.map(item=><Link key={item} href={'/settings/'+item}>{item.replaceAll('-',' ')}</Link>)}</nav>
 <main>{section==='edit-profile'?<ProfileSettings/>:sections.includes(section as typeof sections[number])?<AccountPreferences/>:<p>Section unavailable. <Link href="/settings/edit-profile">Edit profile</Link></p>}</main>
 </section>
}
