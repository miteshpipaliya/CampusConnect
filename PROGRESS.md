# CampusConnect implementation progress
Updated 2026-11-22. Source of truth: code and CI checks, not previous phase claims.

## Current work: content-pipeline batch 1
- DONE: shared pure caption parsing with deduplicated/capped hashtags and mentions.
- DONE: canonical media rules, QuickTime type validation, required duration metadata for story/reel videos.
- DONE: pure composer publish eligibility and file validation with unit tests.
- TODO: tooling lockfile regeneration, React Query provider, optimistic mutations.
- TODO: transactional media claiming and duration inspection from actual object bytes.
- TODO: composer editor, upload queue, overlays, cover picker, feed rendering.
- TODO: post lifecycle and full social graph fan-out.
- TODO: isolated two-account smoke tests and Firestore index deployment.

## Known constraints
The existing lockfile may be out of sync. Do not switch CI to npm ci until the regenerated lockfile is committed and npm ci passes. Phase 1-3 audit PR #19 was merged; its remaining work is not automatically complete. No new functionality is considered production verified until preview smoke tests and CI gates pass.

NEXT: Verify CI quality and Vercel preview for commit c510a1288dfea462b01f8e0a36ba172b62c9ecf8, fix any failures, then complete Batch 0 tooling and remaining Batches 1-7 via reviewed PRs.

## Checkpoint 2026-11-22 (content pipeline)
- DONE: pure media-access allow/deny matrix and claim-purpose matrix with regression tests.
- DONE: transactional media-service claim helper used by post, reel, story publishing.
- PENDING: latest CI quality + Vercel preview verification.
- TODO: Batch 0 dependency lockfile and React Query provider, Batches 2-7 remaining scope, live two-account smoke tests.
NEXT: Check GitHub Actions and Vercel preview for commit 4609b60718880c111b43579822f50f3e541cc4fc, fix errors, then implement media header duration validation and the rest of the uploaded spec; do not merge until all batches verified.

## Checkpoint: media security continuation
- DONE: central claimMedia with transaction-safe snapshot reuse; caption tags/mentions/location persisted; batch feed visibility; cleanup of unattached uploaded media; bounded MP4 duration parser with pure tests.
- TODO: wire duration parser into confirmation (including WebM), finish tooling and React Query, client composer, rendering, social graph, identity, API integration tests, index deployment and smoke tests.
NEXT: Inspect CI quality logs and Vercel preview for content branch; fix any failures. Wire MP4/WebM duration validation at confirm. Complete Batches 0-7 in separate verified PRs; merge only after green CI and preview.

## 2026-11-22 duration confirmation integration
- DONE: MP4/WebM bounded header duration parsing wired into media confirmation; mismatched or unreadable story/reel videos rejected; 409 for unfinished uploads.
- NOTE: MP4 files whose moov atom is beyond the first 64KB will fail closed. WebM with unknown-size segments may fail closed. These formats need expanded fixture tests before production merge.
- PENDING: full CI and Vercel preview checks for newest code; not production verified.
NEXT: Read latest GitHub Actions quality results and Vercel preview for PR #20, fix TypeScript/test/build failures, then complete media-access batching and Batches 0-7 before any merge to main.

## Checkpoint: WebM regression verification
- Verified: GitHub Actions run 45021491746 for commit 47c97868 passed quality and secret-scan; Vercel preview for an earlier commit was Ready. This does not verify the current head.
- DONE: WebM duration fixture and bounded unknown-size EBML segment support.
- PENDING: current-head CI and preview; production unchanged.
NEXT: Verify GitHub Actions quality and Vercel preview for head 71fffe3463f2193d919d320e606992e47fe3ce92; repair any failures. Implement remaining Batches 0-7, API tests and production smoke checks before merge.

## Media URL authorization checkpoint
- DONE: replace per-media Firestore fetches with getAll batches for post, story, avatar, block and close-friend checks; canViewMany called once for authors; pure maySignMedia decides access; fail closed on signing failures.
- IMPORTANT: verify preview behavior for private avatars, close-friends stories, archived posts and blocked users. Newest commit is not yet verified.
- CI: prior GitHub Actions run 45021491746 succeeded for old commit 47c97868 only. Do not infer current head is green.
NEXT: Verify CI quality and Vercel preview for commit 99aafa6a1d1a197aa29f6dab194762b03a2c5576; fix errors and security regressions; implement tooling, composer, rendering, lifecycle, social graph, identity, and API tests before any main merge.
