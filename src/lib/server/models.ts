import type { Timestamp } from 'firebase-admin/firestore';

/** Existing routes write serverTimestamp(); Firestore reads return Timestamp, while legacy data may contain ISO strings. */
export type FirestoreTime = Timestamp | string;
export const isPrivateUser = (user: {privacy?:unknown;isPrivate?:unknown}):boolean => user.privacy==='private'||user.isPrivate===true;
export type ISODateString = string;
export type UID = string;
export type MediaPurpose = 'avatar' | 'post' | 'story' | 'reel' | 'chat';
export type PostType = 'post' | 'reel';
export type FollowStatus = 'active' | 'pending';
export type NotificationType = 'like' | 'comment' | 'reply' | 'mention' | 'comment_like' | 'follow' | 'follow_request' | 'follow_accept' | 'repost' | 'story_reply' | 'story_mention' | 'share';
export interface UserCounters { posts: number; followers: number; following: number }
export interface UserDocument {
  handle: string; handleLower?: string; name: string; nameTokens?: string[];
  bio: string; website: string | null; gender: string | null; branch: string | null;
  division: string | null; avatarMediaId: string | null; privacy?: 'private' | 'campus'; isPrivate?: boolean;
  aiGeneratedLabel: boolean; activityStatus?: boolean; counters?: UserCounters;
  createdAt: FirestoreTime; lastSeenAt: FirestoreTime | null;
}
export interface HandleDocument { uid: UID; changedAt?: FirestoreTime; }
export interface FollowDocument { followerUid: UID; followeeUid: UID; status: FollowStatus; createdAt: FirestoreTime; }
export interface PostMedia {
  mediaId: string; contentType: string; width: number | null; height: number | null;
  durationSec: number | null; thumbMediaId: string | null; alt: string;
}
export interface PostCounters { likes: number; comments: number; reposts: number; saves: number; shares: number; views: number }
export interface PostDocument {
  type?: PostType; authorUid: UID; authorHandle?:string; caption: string; mediaId?:string|null; visibility?:'campus'|'private'; media?: PostMedia[];
  hashtags?: string[]; mentions?: UID[]; commentsOff?: boolean; hideLikeCount?: boolean;
  pinned?: boolean; counters?: PostCounters; score?: number;
  createdAt: FirestoreTime; deletedAt?: FirestoreTime | null;
}
export interface PostLikeDocument { uid: UID; createdAt: FirestoreTime }
export interface CommentDocument { text: string; parentId: string | null; authorUid: UID; counters: { likes: number }; createdAt: FirestoreTime; deletedAt?: FirestoreTime | null }
export interface SaveDocument { postId: string; collectionName?: string; createdAt: FirestoreTime }
export interface RepostDocument { uid: UID; postId: string; createdAt: FirestoreTime }
export interface StoryOverlay { text: string; x: number; y: number; color?: string }
export interface StoryDocument {
  authorUid: UID; mediaId: string; contentType: string; durationSec: number | null;
  caption: string; textOverlays: StoryOverlay[]; audience: 'all' | 'close';
  createdAt: FirestoreTime; expiresAt: FirestoreTime; highlight?:boolean; visibility?:'campus'|'private'; highlightIds?: string[]; archived?: boolean;
}
export interface StoryViewDocument { uid: UID; createdAt: FirestoreTime }
export interface StoryReplyDocument { authorUid: UID; text: string; createdAt: FirestoreTime }
export interface HighlightDocument { ownerUid: UID; title: string; coverMediaId: string | null; storyIds: string[]; createdAt: FirestoreTime }
export interface NotificationDocument {
  type: NotificationType; actorUids: UID[]; postId?: string; storyId?: string;
  commentId?: string; count: number; readAt: FirestoreTime | null; createdAt: FirestoreTime;
}
export interface BlockDocument { blockerUid: UID; blockedUid: UID; createdAt: FirestoreTime }
export interface MuteDocument { ownerUid: UID; mutedUid: UID; posts: boolean; stories: boolean; createdAt: FirestoreTime }
export interface CloseFriendDocument { ownerUid: UID; friendUid: UID; createdAt: FirestoreTime }
export interface ReportDocument { reporterUid: UID; targetType: string; targetId: string; reason: string; createdAt: FirestoreTime; status: 'open' | 'reviewed' | 'dismissed' }
export interface SearchHistoryDocument { query: string; createdAt: FirestoreTime }
export interface HashtagDocument { tag: string; postCount: number; updatedAt: FirestoreTime }
export interface DailyStatsDocument { date: string; profileVisits: number; reach: number; storyViews: number }
export interface FeedItemDocument { postId: string; authorUid: UID; createdAt: FirestoreTime; score: number }
export const COLLECTIONS = {
  users: 'users', handles: 'handles', follows: 'follows', posts: 'posts',
  stories: 'stories', highlights: 'highlights', reposts: 'reposts',
  blocks: 'blocks', mutes: 'mutes', closeFriends: 'closeFriends',
  reports: 'reports', hashtags: 'hashtags', dailyStats: 'dailyStats',
} as const;
