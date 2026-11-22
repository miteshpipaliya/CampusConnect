# CampusConnect Phase 2 — Development and release audit
Branch: `phase-2-completion`, PR #16. Supersedes PR #15 (`phase-2-3`).
Code gate at `acaa51a3`: GitHub Actions quality SUCCESS (npm install, lint, strict TypeScript, Node unit tests, dependency audit, Next build) and secret-scan SUCCESS; Vercel preview READY.
**Validation scope:** automated checks, static route tests and successful preview build. Authenticated two-account workflows against live Firebase, R2, Stream and Firestore are NOT independently verified.

| Item | State | Evidence / remaining work |
|---|---|---|
| Shared Avatar / hydration | IMPLEMENTED | `avatar.tsx`, `avatar-hydration.ts`, hydrated feed, stories, DMs, profiles and suggestions |
| Avatar crop / pan / zoom / upload / remove | IMPLEMENTED | `avatar-crop.tsx`, `real-profile.tsx`, `/api/profile/avatar`, crop unit tests |
| Stream user sync | IMPLEMENTED, integration unverified | `stream-user.ts` sync after photo/name/username changes, chat-token flows, signed R2 URL |
| Profile edit & unique username | IMPLEMENTED | transactional claim, change limit 2 / 14 days, handle tests, `/settings/edit-profile` |
| Email eligibility | IMPLEMENTED | centralized student email validator, hardcoded tester removed; approved test accounts server only |
| Privacy/theme/notification preferences | IMPLEMENTED, some integrations not verified | `/api/settings`, `/settings` UI; notification filtering for likes/comments, close-friends stories |
| Blocked/muted/close friends | PARTIAL | Functional CRUD and settings, blocking checks in core content/chat. Mutes not yet enforced on all feeds/stories. Stream two-way-block setting requires owner validation |
| Saved posts, archive, activity | IMPLEMENTED, index deployment needed | `/api/saves`, `/api/archive`, `/api/activity`, post detail and UI; Firestore indexes pending owner deploy |
| Delete account | IMPLEMENTED, guarded / unverified integration | authenticated soft-delete, disabled Firebase account, 30-day grace, batch purge, Stream async hard-delete. Requires CRON flags and owner validation before enabling |
| Logout all devices | IMPLEMENTED | `/api/account/sessions` refresh token revocation |
| Server-side privacy | PARTIAL, security review pending | check feeds, media, posts/reels/stories/profile/comment/like/repost/chat; no complete multi-account attack/authorization audit |
| End-to-end student tests | NOT VERIFIED | Needs two real test accounts and configured Firebase/R2/Stream + required Firestore indexes |
| Lockfile accuracy | BLOCKED | `package-lock.json` predates Firebase/R2 deps. `npm ci` fails EUSAGE. CI temporarily uses `npm install` until owner or local agent regenerates lockfile |
| Production main merge | NOT DONE | No deployment to production was performed |

## Owner-only deployment prerequisites
1. Regenerate and commit lockfile with `npm install --package-lock-only` and verify `npm ci`; restore CI to npm ci.
2. Review then deploy `firebase deploy --only firestore:indexes`.
3. Configure Stream Chat two-way blocking, Stream deletion permissions, and R2 CORS.
4. Keep `CRON_DELETE_ENABLED`, `CRON_PURGE_ACCOUNTS_ENABLED`, `STREAM_CLIENT_TOKENS_ENABLED` disabled until reviewed and end-to-end tests pass.
5. Test private account, blocked DMs, close-friends stories, avatar sync, save/activity/archive, account deletion against isolated test accounts.
NEXT: resolve owner dependencies + E2E tests, review code, then merge PR #16 into main.
