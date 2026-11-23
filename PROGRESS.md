# CampusConnect — implementation and audit progress

Updated **2026-11-24**. Source of truth: GitHub branch code and CI results for the exact commit.

## Current development branch
- **Branch:** `12-adudit`, based on production `main` at `d8c77a2bbb9b391219467530907fe5f477491712`
- **Review PR:** [#34](https://github.com/miteshpipaliya/CampusConnect/pull/34) (**draft, unmerged**)
- **Production:** untouched by this audit. Do not deploy/merge it until index/Stream/R2/two-account acceptance and reviewer approval.
- A prior audit commit `7beba1da18be35b492ecb387e14d0d1b64ca7bcf` passed GitHub CI and had a Ready Vercel preview. Newer commits must be validated independently.

## Scope matrix
| Area | Code status in 12-adudit | External verification status |
|---|---|---|
| Phase 5 comments | Threaded replies, like, pin, delete, pagination, avatars and notifications implemented | Manual two-account checks not done |
| Phase 5 saves | Named collections, count summary and paginated reads implemented | Manual check not done; collection counts scan capped |
| Phase 5 post management | Caption tag updates, pin, hide likes, disable comments, archive/delete + feed cleanup implemented | Follow-feed cleanup capped; manual check needed |
| Phase 5 reports/post modal | Report validation, owner/admin queue, modal permalink implemented | UI navigation and moderation acceptance needed |
| Phase 6 story tray | Filter by followed authors before fetching, bounded queries with index fallback | Real campus >150-story test not done |
| Phase 7 Reel views | Older single-video posts accepted after video-media authorization | Actual watch/session test not done |
| Phase 8 search/explore | Hashtag legacy count fallback, batched blocks, carousel media | Tag index provisioning not verified; trending sort remains page-local |
| Phase 9 notifications | Legacy-compatible scanned unread summary and 99+ navigation badge | High-volume read cost, unread and message counts need testing |
| Phase 11 profiles | Followers/following/post stats, verified indicator, tagged/saved/pinned tabs, report/block | Firebase verification policy and private-profile tests pending |
| Phase 11 dashboard | 7/30-day personal summary, daily profile visits, Story and Reel views | Live-counter reconciliation and historical backfill not done |
| Phase 11 moderation | Firebase custom-claim guard, report queue, actions and audit log | Admin claim must be provisioned, owner-run permission tests |
| Phase 4 chat hardening | Existing REST fallback, token-refresh callbacks, server blocking; new inline retry and isolated group routes | Multi-account Stream group creation/member permissions unverified |
| Phase 12 demo/CSP | Removed old unused demo code, sample API and Unsplash image policy | Regression checks required for final head |
| Phase 12 React Query/Playwright | **Not implemented**; dependencies absent from `package.json` and lockfile | Install dependencies with lockfile update in a reviewed PR before adding integrations |
| Phase 12 CSS consolidation | **Not implemented** intentionally to avoid changing loaded route CSS cascade | Visual regression test first |
| Phase 12 documentation | Updated README, ARCHITECTURE, SECURITY, KNOWN_RISKS, MANUAL_QA, DECISIONS | Review as part of PR #34 |

## Release gates still open
1. **Latest exact head:** read successful GitHub quality and secret scan and a matching Ready Vercel preview; do not infer from older builds.
2. **Firestore:** verify declared indexes in staging, particularly `posts.hashtags+createdAt` and `stories.authorUid+expiresAt`, before high-volume testing. Tagged listing currently uses a single-field `mentions` query.
3. **Real accounts:** run `docs/MANUAL_QA.md` with at least two users, including blocked/private/close-friends and distinct group members.
4. **Stream:** review member-only permissions, group creation, rename, leave, token refresh, connection, presence, unread counts; keep `STREAM_CLIENT_TOKENS_ENABLED=false` until approved.
5. **R2/CORS:** verify unsigned access fails, signed URLs expire, uploads and DM attachments work.
6. **Dependencies:** install `@tanstack/react-query` and `@playwright/test` on `12-adudit` with an up-to-date lockfile. Add Playwright CI only after installing Chromium in CI.
7. **Moderation:** ensure correct Firebase custom claim, test reports and all consequences using test accounts.
8. **Deployment:** keep PR #34 draft and production unchanged until independent acceptance/approval.

**Implemented source ≠ live tested ≠ production ready.**
