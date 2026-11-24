import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {auth} from '@/lib/server/services';
import {isAdmin} from '@/lib/server/admin';
import {AdminReports} from '@/components/admin-reports';
export const dynamic='force-dynamic';
export default async function AdminPage(){
 const cookie=(await cookies()).get('cc_session')?.value;
 if(!cookie)notFound();
 try{
  const claims=await auth().verifySessionCookie(cookie,true);
  if(!await isAdmin(claims.uid))notFound();
 }catch{notFound()}
 return <AdminReports/>;
}
