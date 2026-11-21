# CampusConnect Force Upgrade — Execution Progress

Status values: TODO | DOING | DONE | BLOCKED. DONE requires successful validation evidence. Production is not certified by this checklist.

## Phase 1: Foundation

- [ ] **TODO** — 1.1 Typed Firestore models and composite indexes
- [ ] **TODO** — 1.2 Eliminate N+1 queries, batch hydration, cursor pagination, session cache
- [ ] **TODO** — 1.3 R2 media pipeline validation, compression, progress and retry
- [ ] **TODO** — 1.4 Batched presigned media URLs and privacy checks
- [ ] **TODO** — 1.5 Storage abstraction for R2/S3/B2
- [ ] **TODO** — 1.6 Protected cleanup cron and lifecycle cleanup
- [ ] **TODO** — 1.7 Transactional per-user and IP rate limits
- [ ] **TODO** — 1.8 CSP Stream CDN and R2 hosts; remove demo hosts
- [ ] **TODO** — 1.9 TanStack Query caching and optimistic updates
- [ ] **TODO** — 1.10 Idempotent legacy-data migration

## Phase 2: Identity, avatars and settings

- [ ] **TODO** — 2.1 Reusable Avatar component across all views
- [ ] **TODO** — 2.2 Sync avatar media with Stream users
- [ ] **TODO** — 2.3 Crop, upload and remove avatar
- [ ] **TODO** — 2.4 Complete profile, notification, privacy, close friends, blocks, mutes, saves, archive, activity, appearance and account deletion settings

## Phase 3: Social graph

- [ ] **TODO** — 3.1 Transactional follow/unfollow, requests, notifications and feed backfill
- [ ] **TODO** — 3.2 Followers/following modal and mutual relationships
- [ ] **TODO** — 3.3 Block, mute and close friends behavior
- [ ] **TODO** — 3.4 Relevant suggested students
- [ ] **TODO** — 3.5 Central canViewAuthor privacy enforcement

## Phase 4: Creation

- [ ] **TODO** — 4.1 Three distinct Post/Story/Reel creation flows
- [ ] **TODO** — 4.2 Post carousel editor, metadata, uploads and controls
- [ ] **TODO** — 4.3 24-hour story creator and audience
- [ ] **TODO** — 4.4 Video reel creator and cover picker
- [ ] **TODO** — 4.5 Server-side hashtag/mention parsing, fan-out and notifications

## Phase 5: Feed and posts

- [ ] **TODO** — 5.1 Home shell, stories, suggestions and mini chat
- [ ] **TODO** — 5.2 Complete post card, media carousel and controls
- [ ] **TODO** — 5.3 Transactional like/unlike and notifications
- [ ] **TODO** — 5.4 Comments, replies, likes, pinning and pagination
- [ ] **TODO** — 5.5 Save/unsave and collections
- [ ] **TODO** — 5.6 Repost/undo and notifications
- [ ] **TODO** — 5.7 Share sheet, DMs, links and share counters
- [ ] **TODO** — 5.8 Post actions and moderation
- [ ] **TODO** — 5.9 Post detail intercepting and standalone routes
- [ ] **TODO** — 5.10 Infinite scrolling, skeletons and refresh

## Phase 6: Stories

- [ ] **TODO** — 6.1 Story tray ordering and rings
- [ ] **TODO** — 6.2 Full-screen story viewer interactions
- [ ] **TODO** — 6.3 Idempotent views and viewer sheet
- [ ] **TODO** — 6.4 Replies and reactions through Stream
- [ ] **TODO** — 6.5 Enforce server-side 24-hour expiry everywhere and tests
- [ ] **TODO** — 6.6 Persistent highlights
- [ ] **TODO** — 6.7 Story archive

## Phase 7: Reels

- [ ] **TODO** — 7.1 Full-height snap playback, mute and pagination
- [ ] **TODO** — 7.2 Reel actions, creator information and audio label
- [ ] **TODO** — 7.3 Unique qualified views after 3 seconds

## Phase 8: Search and explore

- [ ] **TODO** — 8.1 Search panel, history and live grouped results
- [ ] **TODO** — 8.2 Explore grid, ranking and pagination
- [ ] **TODO** — 8.3 Hashtag detail pages

## Phase 9: Notifications

- [ ] **TODO** — 9.1 Grouped notification types, time sections and inline actions
- [ ] **TODO** — 9.2 Unread badges, polling and notification preferences

## Phase 10: Direct messages

- [ ] **TODO** — 10.1 Official Stream SDK, tokens, websocket and robust errors
- [ ] **TODO** — 10.2 Instagram-style responsive inbox and conversation search
- [ ] **TODO** — 10.3 Media, voice, reactions, reply, unsend, delete-for-me, forwarding, cards, typing, read, presence, group chats and pagination
- [ ] **TODO** — 10.4 DM entry points and block enforcement

## Phase 11: Profile, dashboard and safety

- [ ] **TODO** — 11.1 Profile header, follow actions, highlights and content grids
- [ ] **TODO** — 11.2 Analytics dashboard and daily stats
- [ ] **TODO** — 11.3 Reports, admin moderation queue, guidelines and safety settings

## Phase 12: Shell, quality and docs

- [ ] **TODO** — 12.1 Responsive navigation, campus links and actions
- [ ] **TODO** — 12.2 Consolidated token-based CSS, accessibility and themes
- [ ] **TODO** — 12.3 Loading, errors, toasts and responsive layout checks
- [ ] **TODO** — 12.4 Unit, integration and Playwright end-to-end tests in CI
- [ ] **TODO** — 12.5 Security review and npm audit
- [ ] **TODO** — 12.6 Lockfile, npm ci, README, architecture, integration, risks, env and index documentation

## External owner setup / release gates

- [ ] **TODO** — Configure Vercel environment variables and cron secret
- [ ] **TODO** — Deploy Firestore composite indexes
- [ ] **TODO** — Configure R2 CORS and verify media endpoints
- [ ] **TODO** — Verify Stream dashboard configuration
- [ ] **TODO** — Verify all CI gates, migration dry run and production deployment

## Working rules

For each unit: implement, run `npm run typecheck && npm run lint && npm test && npm run build`, commit only if all pass, rebase on origin/main, push. Preserve existing data and record decisions in DECISIONS.md.
