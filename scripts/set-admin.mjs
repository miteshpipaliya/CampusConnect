// Owner-only local command. Set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
import {initializeApp,cert,getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const email=process.argv[2];
if(!email||!email.includes('@'))throw Error('Usage: node scripts/set-admin.mjs <email>');
const projectId=process.env.FIREBASE_PROJECT_ID,clientEmail=process.env.FIREBASE_CLIENT_EMAIL,privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
if(!projectId||!clientEmail||!privateKey)throw Error('Missing Firebase Admin credentials');
if(!getApps().length)initializeApp({credential:cert({projectId,clientEmail,privateKey})});
const auth=getAuth(),person=await auth.getUserByEmail(email);
await auth.setCustomUserClaims(person.uid,{...(person.customClaims||{}),admin:true});
console.log('Admin claim updated. Existing sessions must sign in again.');
