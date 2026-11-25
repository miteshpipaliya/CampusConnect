import {PanelErrorBoundary} from '@/components/panel-error-boundary';
import {ReelFeed} from '@/components/reel-feed';
import '@/app/reels-upgrade.css';
export default function ReelsPage(){return <PanelErrorBoundary label="Reels"><ReelFeed/></PanelErrorBoundary>}