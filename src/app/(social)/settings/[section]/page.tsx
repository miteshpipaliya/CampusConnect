import Link from 'next/link';
import {SavedPosts} from '@/components/saved-posts';
import {UserActivity} from '@/components/user-activity';
import {StoryArchive} from '@/components/story-archive';
import {ProfileSettings} from '@/components/profile-settings';
import {SessionActions} from '@/components/session-actions';
import {DeleteAccount} from '@/components/delete-account';
import {RelationSettings} from '@/components/relation-settings';
import {AccountPreferences} from '@/components/account-preferences';
import {FollowRequests} from '@/components/follow-requests';
const sections=['edit-profile','notifications','account-privacy','appearance','blocked','muted','close-friends','follow-requests','delete-account','saved','archive','your-activity','log-out'] as const;
export default async function SettingsSection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 return <section style={{display:'grid',gridTemplateColumns:'minmax(160px,220px) minmax(0,1fr)',gap:24,maxWidth:1100,margin:'0 auto',padding:20}}>
 <nav aria-label="Settings sections" style={{display:'grid',gap:12,alignContent:'start'}}>{sections.map(item=><Link key={item} href={'/settings/'+item}>{item.replaceAll('-',' ')}</Link>)}</nav>
 <main>{section==='edit-profile'?<ProfileSettings/>:section==='log-out'?<SessionActions/>:section==='saved'?<SavedPosts/>:section==='archive'?<StoryArchive/>:section==='your-activity'?<UserActivity/>:section==='delete-account'?<DeleteAccount/>:section==='blocked'?<RelationSettings kind="blocks"/>:section==='muted'?<RelationSettings kind="mutes"/>:section==='close-friends'?<RelationSettings kind="close-friends"/>:section==='follow-requests'?<FollowRequests/>:sections.includes(section as typeof sections[number])?<AccountPreferences/>:<p>Section unavailable. <Link href="/settings/edit-profile">Edit profile</Link></p>}</main>
 </section>
}
