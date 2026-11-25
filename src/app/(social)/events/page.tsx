import {redirect} from 'next/navigation';
// Campus event discovery uses the existing authenticated, privacy-filtered hashtag feed.
export default function EventsPage(){redirect('/explore/tags/events')}
