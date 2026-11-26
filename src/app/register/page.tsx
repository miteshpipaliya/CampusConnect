import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {introCompleted,INTRO_COOKIE} from '@/lib/server/introduction';
import { CampusAuth } from '@/components/connected-app';
export default async function Register(){if(!introCompleted((await cookies()).get(INTRO_COOKIE)?.value))redirect('/');return <CampusAuth mode="register"/>}
