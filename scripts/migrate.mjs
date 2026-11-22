import {existsSync} from 'node:fs';
import {deriveHandleLower,deriveNameTokens,postToV2} from '../src/lib/core/migrate-transforms.ts';
if(existsSync('.env.local')&&typeof process.loadEnvFile==='function')process.loadEnvFile('.env.local');
const apply=process.argv.includes('--apply');
const {cert,getApps,initializeApp}=await import('firebase-admin/app');
const {getFirestore,Timestamp}=await import('firebase-admin/firestore');
const projectId=process.env.FIREBASE_PROJECT_ID,clientEmail=process.env.FIREBASE_CLIENT_EMAIL,privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
if(!projectId||!clientEmail||!privateKey)throw Error('Firebase configuration unavailable');
const app=getApps()[0]??initializeApp({credential:cert({projectId,clientEmail,privateKey}),projectId});
const db=getFirestore(app);
const totals={users:0,posts:0,stories:0,handles:0};
async function update(ref,patch){if(apply)await ref.set(patch,{merge:true})}
for(const user of (await db.collection('users').get()).docs){
 const data=user.data(),handle=String(data.handle||'');totals.users++;
 await update(user.ref,{handleLower:deriveHandleLower(handle),nameTokens:deriveNameTokens(data.name),isPrivate:data.privacy==='private'||data.isPrivate===true});
 if(handle){totals.handles++;await update(db.collection('handles').doc(handle),{uid:user.id})}
}
for(const post of (await db.collection('posts').get()).docs){
 const data=post.data();totals.posts++;
 const patch=postToV2(data);
 const [likes,comments,reposts]=await Promise.all([post.ref.collection('likes').count().get(),post.ref.collection('comments').count().get(),db.collection('reposts').where('postId','==',post.id).count().get()]);
 await update(post.ref,{...patch,counters:{likes:likes.data().count,comments:comments.data().count,reposts:reposts.data().count,saves:0,shares:0,views:0}});
}
for(const story of (await db.collection('stories').get()).docs){
 totals.stories++;const data=story.data();
 if(!data.expiresAt){const created=data.createdAt?.toMillis?.();if(typeof created==='number')await update(story.ref,{expiresAt:Timestamp.fromMillis(created+86400000)})}
}
console.log(JSON.stringify({mode:apply?'APPLY':'DRY_RUN',counts:totals}));
