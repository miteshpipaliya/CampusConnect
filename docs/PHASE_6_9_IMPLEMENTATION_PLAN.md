# Stacked branch plan
1. upgrade/phase-6-stories from main: privacy-aware story tray, story player, views, replies, reactions, highlights and expiry tests.
2. upgrade/phase-7-reels from Phase 6: cursor-paginated video feed, playback, interactions, idempotent view records.
3. upgrade/phase-8-search-explore from Phase 7: account/hashtag search, Firestore history, privacy-filtered Explore mosaic and hashtag pages.
4. upgrade/phase-9-notifications from Phase 8: notification list, mark-as-read, unread summary, deduplication and preferences.
Per phase: commit, open stacked PR, inspect CI logs, verify matching Vercel Preview; no production merge until owner approves. Firestore index deployment and signed-in two-account acceptance require separately evidenced validation.
