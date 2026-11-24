# CampusConnect architecture and release decisions

Updated 2026-11-24.

- Honor the owner's explicit one-branch instruction: `12-adudit`, not five merges into `main`; PR #34 merged; new upgrade must use a separate PR.
- Keep all existing production APIs and response keys compatible when introducing new data.
- Strict TypeScript and `npm ci` remain mandatory; do not add unlocked packages or weaken type checking.
- Authorization uses server-side Firebase session cookies and `guard`; private posts, stories and group members must fail closed on blocks or missing visibility.
- The installed `stream-chat@10.2.0` client library lacks the server `createToken` API assumed in the uploaded audit prompt. Keep signed short-lived server JWTs guarded, rate-limited and opt-in rather than attempting an incompatible call.
- New campus group chats use server-to-Stream requests and do not change the original direct-message path. This feature needs review of Stream channel creation and membership permissions with real test users.
- `STREAM_CLIENT_TOKENS_ENABLED` remains `false` by default; existing server REST messages keep working.
- Analytics daily counters are incremental from deployment; they are not historical reconstructions. Empty days are zeros; unusual traffic and anonymous visits are not invented.
- Story tray reads authors first; missing composite index takes a bounded fallback rather than crashing the Home page. Staging index installation is required for scale.
- Unread notification summary scans older records for compatibility. It is bounded and reports truncation; later introduce server-side maintained aggregates if accounts grow large.
- Post fan-out cleanup has a bounded safety limit; partial operation is reported rather than silently claiming perfect global deletion. Add background reconciliation before large-scale release.
- Do not migrate or delete real production Firestore data from PR #34.
- Keep CSS import order unchanged until visual regression tests can validate consolidation.
- React Query and Playwright were absent in the repository; avoid importing nonexistent packages until dependencies and lockfile are updated and CI can install them.
- Do not claim a bug-free or fully Instagram-compatible product solely from CI or Vercel's Ready state.

- R1: preserve original video aspect, full-width workspace, mount only active and neighboring videos; never touch production main during the new upgrade.

- R2: use the same media signer for redirect and list endpoints; signed URLs cannot be revoked after issuance. Report authorization returns a generic unavailable response.

- Home redesign is isolated from approved Reels source. Feed actions update local post state rather than polling and replacing the entire feed.

- Home Following uses bounded author relationship reads, not a new composite index. Mutual suggestions are limited to 20 followed accounts and 12 candidates.

- Own story opens viewer while separate plus opens composer. Story media uses authenticated redirect to avoid stale 60-second signed links. View counts exclude owner.

- Realtime upgrade: retain Firestore server authority; visible-tab five-second social notification fallback (not Firestore listeners). Stream events trigger authorized REST refresh. Optional generic FCM push via pinned Firebase CDN; device registrations owner-bound and expiring. Preserve production opt-in gate.

- Notification summary uses aggregate counts for canonical read booleans, retains bounded fallback for older documents and skips Stream REST unread queries while a live authorized inbox is active. No new Firestore indexes required.

- Final integration audit: avoid placing R2 bearer URLs into third-party Stream identity records; render avatars through the existing authorized CampusConnect API. Disconnect partially connected Stream clients on setup errors and avoid logging provider message text.

- 1stepcloser: use scoped shell tokens/width overrides instead of rewriting all legacy styles at once. Audio begins at 1 on a new visit, shares reel volume within the feed, and pauses inactive videos. A browser-blocked audible play falls back to temporary mute and retries on interaction. No changes to Stream token or Firebase security controls.

- Hover navigation: keep a 72px grid rail with overlay expansion to 244px; Profile stays compact with no suggestions. Profile Reel previews seek a deterministic interior frame via the existing authorized media endpoint, remain silent and never autoplay. No public media, new credentials or additional storage objects.
