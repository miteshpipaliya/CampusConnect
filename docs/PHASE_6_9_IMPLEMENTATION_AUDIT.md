# CampusConnect Phase 6–9 live repository audit
Source baseline: `main` at `dd35a3a9b9a7dd55f3177e48fdbd04fce5f7d6d5` (23 Nov 2026).
This document is a code audit, not proof of live two-account testing.
- Phase 6: Existing /api/stories upload, poll voting, temporary expiry field, single story overlay and boolean highlights. Missing grouped seen/unseen tray, persistent unique views, owner viewer list, story reply chat cards, highlight collection CRUD/viewer, archive paging.
- Phase 7: /api/reels scanned video posts but had no cursor, /reels was a placeholder.
- Phase 8: /explore was a placeholder, no search/history/explore APIs.
- Phase 9: /api/notifications read 50 unpaginated docs; /notifications was a placeholder; incompatible legacy read/readAt and follow_accepted naming.
- Auth: session cookie and same-origin guard. Firestore indexes live status unverified. Cloudflare R2 CORS and Stream production roles not audited in this project.
- Privacy: `canViewAuthor` and `canViewMany` are available, but every new path must separately check close-friends and blocks.
- Changes are stacked phase branches only; production main is intentionally untouched.
