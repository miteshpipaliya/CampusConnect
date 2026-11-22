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
