import {BrandMark} from '@/components/brand-mark';
import {OfflineRecovery} from '@/components/pwa/offline-recovery';
export const dynamic='force-static';
export default function OfflinePage(){return <main className="cc-offline-page"><BrandMark/><h1>You&apos;re offline</h1><p>Reconnect to view your campus community.</p><OfflineRecovery/></main>}
