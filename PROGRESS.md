# CampusConnect execution
## Phase 1
Merged PRs #11–#14. See git history for implementation and outstanding foundation items (TanStack Query, audit and migration review).
## Phase 2 — IN PROGRESS
- [x] Shared student email allowlist and tests; hardcoded tester email removed.
- [ ] Shared avatar and media hydration, edit/crop/remove.
- [ ] Profile settings, transactional username changes and availability.
- [ ] Complete settings UI, activity, appearance and account deletion.
## Phase 3 — IN PROGRESS
- [x] Pure privacy truth table and follow decision tests.
- [ ] Follow/unfollow/request routes and counters.
- [ ] Follower/following lists, block/mute/close-friends, suggestions.
- [ ] Privacy enforcement across feed, media, stories, reels, profiles and chat.
- [ ] Following feed fan-out and index validation.
NEXT: implement API and UI in isolated commits, verify CI and Vercel before merge. No production data changes.
