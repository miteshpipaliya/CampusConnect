# CampusConnect Release Readiness — PR #22

**Status:** NOT READY TO MERGE / NOT PRODUCTION-APPROVED. This file is a verification checklist, not proof that untested integrations work.

## Source of truth
- Repository: `miteshpipaliya/CampusConnect`
- Candidate: `fix/campusconnect-release-readiness`, PR #22 (draft). Main baseline: `732fa10524b0f8fa737e4c20e1895fca3c8a167d`.
- Last **fully successful** GitHub CI: run `45031907816`, SHA `58695eaecec2c42e40b36bb1e83cb9fe228c7f3c`.
  - Confirmed: locked dependency install, ESLint (27 warnings/0 errors), TypeScript, 53 unit tests, audit threshold high/critical (14 moderate findings), Next.js production build and secret scan.
- Later candidate fixes: `c1d5c097` (cancel upload), `c41272ed` (revoke private attachment before unsend), `5bf06e69` (authorization-aware activity label). **CI on these newer commits must be checked separately.**
- Last Vercel preview known READY: `c549e07e2c3fc1aabb60cb89b8f7af8e2a96f56a`; newer preview builds were blocked by Vercel's daily free deployment limit. A READY preview for an older commit is not a pass for the final SHA.

## Automated release gates
- [ ] Green quality and secret-scan jobs for **exact final PR head SHA** (not the older SHA above)
- [ ] Fresh **Preview** deployment marked READY for the same SHA; examine build output and runtime logs
- [ ] Preview smoke validation of authentication, navigation and chat/media endpoints
- [ ] Resolve or accept ESLint warnings and 14 moderate audit advisories explicitly after review
- [ ] Firestore composite indexes deployed and validated in the isolated development environment

## Live acceptance matrix (requires separate test accounts and configured non-production services)
- [ ] Signed-out requests rejected; wrong-origin chat token request rejected; disabled Stream client token issuance rejected
- [ ] Test users A and B: send/receive text live without refresh, receipts, typing start/stop, message pagination, replies and reactions
- [ ] Sender-only unsend, per-user removal, lost-socket reconnect, full sign-out/session expiry, second-device sign-in and token renewal
- [ ] Activity-status OFF for either party hides the green online dot; blocked/deleted users cannot see presence or exchange messages
- [ ] Stream permission policy review: browser tokens cannot enumerate nonmember conversations or bypass bilateral block/privacy checks
- [ ] R2 images and videos: signed reserve/PUT/confirm, progress, cancellation at each upload stage, chat attachment retrieval authorized to sender and intended unblocked peer only
- [ ] Attachments inaccessible after unsend, hidden for the recipient after remove-for-me, and inaccessible to unrelated accounts
- [ ] Share existing posts/Reels, honor private or deleted/archived sources on every view, and verify notifications with recipient preferences
- [ ] Regression tests for post/story visibility, close-friends rules, media duration handling and content pipeline
- [ ] Review remaining incomplete content/composer/social-graph work in `PROGRESS.md`; mark only implemented and tested scope as ready

## Guardrails
1. Keep `main`, production, live Firebase/R2 and live Stream settings unchanged until approval; PR #22 stays draft.
2. Keep `STREAM_CLIENT_TOKENS_ENABLED` disabled until Stream's server-side role/channel permissions and acceptance are independently verified.
3. No test credentials or secrets in GitHub, PR comments or commit history.
4. If Vercel daily quota is reached, stop deployment attempts; do not claim the older preview validates newer code or change the plan/billing without approval.
5. Merge and production deployment require explicit separate authorization after all required gates pass.
