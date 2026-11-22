# CampusConnect Phase 2 — identity and settings
Branch: phase-2-3; PR #15 (draft). Do not merge until all Phase 2 acceptance criteria and security checks pass.

| Item | Status | Evidence |
|---|---|---|
| 2.1 Reusable Avatar component | PARTIAL | src/components/avatar.tsx; wired in profile, not every app surface |
| 2.2 Stream user/avatar/name sync | TODO | token endpoint still reads photoURL; needs authenticated sync |
| 2.3 Avatar crop/upload/removal | PARTIAL | avatar POST/DELETE and profile UI; crop/zoom/pan modal not implemented |
| 2.4 Settings routes and persistence | PARTIAL | profile settings, username claim, GET/PATCH /api/settings, /settings/[section] for edit/privacy/notifications/appearance |
| Username 2 changes/14d | IMPLEMENTED | Firestore transaction history |
| Email allowlist | IMPLEMENTED | shared helper; removed hardcoded tester email |
| Close friends, blocked, muted | TODO | Phase 3 dependencies; no misleading UI |
| Saved, archive, activity | TODO | requires supporting endpoints |
| Account deletion | TODO | requires safe soft-delete and cleanup plan |
| Log out and sessions | PARTIAL | existing auth logout; all-device revoke not implemented |
| Server-side private-account enforcement | BLOCKED | must enforce on every read, media and chat before enabling privacy feature |
| Test gates | PENDING | GitHub quality and Vercel checks for latest commit |

NEXT: Resolve CI, implement Stream sync and avatar crop, add settings sections and privacy enforcement, run end-to-end tests, then mark PR ready and merge. No production data was modified.
