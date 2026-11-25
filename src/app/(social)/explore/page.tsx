import {PanelErrorBoundary} from '@/components/panel-error-boundary';
import {ExploreSearchBar} from '@/components/explore/search-bar';import {ExploreGrid} from '@/components/explore-grid';
import '@/app/explore-upgrade.css';
export default function ExplorePage(){return <PanelErrorBoundary label="Explore"><section className="cc-explore-page"><ExploreSearchBar/><ExploreGrid/></section></PanelErrorBoundary>}
