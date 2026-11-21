import 'server-only';

/** Firestore document shapes. Timestamps are stored as ISO strings by current routes. */
export type ISODateString = string;
export type UID = string;
export type MediaPurpose = 'avatar' | 'post' | 'story' | 'reel' | 'chat';
export type PostType = 'post' | 'reel';
export type FollowStatus = 'active' | 'pending';
export type NotificationType = 'like' | 'comment' | 'reply' | 'mention' | 'comment_like' | 'follow' | 'follow_request' | 'follow_accept' | 'repost' | 'story_reply' | 'story_mention' | 'share';
export interface UserCounters { posts: number; followers: number; following: number }
export interface UserDocument {
  handle: string; handleLower: string; name: string; nameTokens: string[];
  bio: string; website: string | null; gender: string | null; branch: string | null;
  division: string | null; avatarMediaId: string | null; isPrivate: boolean;
  aiGeneratedLabel: boolean; activityStatus: boolean; counters: UserCounters;
  createdAt: ISODateString; lastSeenAt: ISODateString | null;
}
export interface HandleDocument { uid: UID; changedAt?: ISODateString; }
export interface FollowDocument { followerUid: UID; followeeUid: UID; status: FollowStatus; createdAt: ISODateString; }
export interface PostMedia {
  mediaId: string; contentType: string; width: number | null; height: number | null;
  durationSec: number | null; thumbMediaId: string | null; alt: string;
}
export interface PostCounters { likes: number; comments: number; reposts: number; saves: number; shares: number; views: number }
export interface PostDocument {
  type: PostType; authorUid: UID; caption: string; media: PostMedia[];
  hashtags: string[]; mentions: UID[]; commentsOff: boolean; hideLikeCount: boolean;
  pinned: boolean; counters: PostCounters; score: number;
  createdAt: ISODateString; deletedAt: ISODateString | null;
}
export interface PostLikeDocument { uid: UID; createdAt: ISODateString }
export interface CommentDocument { text: string; parentId: string | null; authorUid: UID; counters: { likes: number }; createdAt: ISODateString; deletedAt?: ISODateString | null }
export interface SaveDocument { postId: string; collectionName?: string; createdAt: ISODateString }
export interface RepostDocument { uid: UID; postId: string; createdAt: ISODateString }
export interface StoryOverlay { text: string; x: number; y: number; color?: string }
export interface StoryDocument {
  authorUid: UID; mediaId: string; contentType: string; durationSec: number | null;
  caption: string; textOverlays: StoryOverlay[]; audience: 'all' | 'close';
  createdAt: ISODateString; expiresAt: ISODateString; highlightIds: string[]; archived: boolean;
}
export interface StoryViewDocument { uid: UID; createdAt: ISODateString }
export interface StoryReplyDocument { authorUid: UID; text: string; createdAt: ISODateString }
export interface HighlightDocument { ownerUid: UID; title: string; coverMediaId: string | null; storyIds: string[]; createdAt: ISODateString }
export interface NotificationDocument {
  type: NotificationType; actorUids: UID[]; postId?: string; storyId?: string;
  commentId?: string; count: number; readAt: ISODateString | null; createdAt: ISODateString;
}
export interface BlockDocument { blockerUid: UID; blockedUid: UID; createdAt: ISODateString }
export interface MuteDocument { ownerUid: UID; mutedUid: UID; posts: boolean; stories: boolean; createdAt: ISODateString }
export interface CloseFriendDocument { ownerUid: UID; friendUid: UID; createdAt: ISODateString }
export interface ReportDocument { reporterUid: UID; targetType: string; targetId: string; reason: string; createdAt: ISODateString; status: 'open' | 'reviewed' | 'dismissed' }
export interface SearchHistoryDocument { query: string; createdAt: ISODateString }
export interface HashtagDocument { tag: string; postCount: number; updatedAt: ISODateString }
export interface DailyStatsDocument { date: string; profileVisits: number; reach: number; storyViews: number }
export interface FeedItemDocument { postId: string; authorUid: UID; createdAt: ISODateString; score: number }
export const COLLECTIONS = {
  users: 'users', handles: 'handles', follows: 'follows', posts: 'posts',
  stories: 'stories', highlights: 'highlights', reposts: 'reposts',
  blocks: 'blocks', mutes: 'mutes', closeFriends: 'closeFriends',
  reports: 'reports', hashtags: 'hashtags', dailyStats: 'dailyStats',
} as const;
