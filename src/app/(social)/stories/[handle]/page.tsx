import {StoryViewer} from '@/components/story-viewer';
import '@/app/live-story-upgrade.css';
export default async function StoryPage({params}:{params:Promise<{handle:string}>}){const {handle}=await params;return <StoryViewer handle={handle}/>}