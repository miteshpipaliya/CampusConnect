import {StoryViewer} from '@/components/story-viewer';
import '@/app/live-story-upgrade.css';
export default async function HighlightPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <StoryViewer handle="" highlightId={id}/>;
}
