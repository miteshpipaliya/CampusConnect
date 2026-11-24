# CampusConnect — implementation and audit progress

Updated **2026-11-24**. Source of truth: GitHub branch code and CI results for the exact commit.

## Current development branch
- **Branch:** `12-adudit`, based on production `main` at `d8c77a2bbb9b391219467530907fe5f477491712`
- **Review PR:** [#34](https://github.com/miteshpipaliya/CampusConnect/pull/34) (merged into main as ecb28ea; new upgrade requires a separate PR)
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
| Phase 12 React Query/Playwright | Provider, account-scoped notification query, pinned package metadata and Chromium smoke CI implemented | Exact-head CI must validate install and tests |
| Phase 12 CSS consolidation | Root styles combined in previous cascade order; profile inline styles moved to classes | Visual regression test pending |
| Phase 12 documentation | Updated README, ARCHITECTURE, SECURITY, KNOWN_RISKS, MANUAL_QA, DECISIONS | Review as part of PR #34 |

## Release gates still open
1. **Latest exact head:** read successful GitHub quality and secret scan and a matching Ready Vercel preview; do not infer from older builds.
2. **Firestore:** verify declared indexes in staging, particularly `posts.hashtags+createdAt` and `stories.authorUid+expiresAt`, before high-volume testing. Tagged listing currently uses a single-field `mentions` query.
3. **Real accounts:** run `docs/MANUAL_QA.md` with at least two users, including blocked/private/close-friends and distinct group members.
4. **Stream:** review member-only permissions, group creation, rename, leave, token refresh, connection, presence, unread counts; keep `STREAM_CLIENT_TOKENS_ENABLED=false` until approved.
5. **R2/CORS:** verify unsigned access fails, signed URLs expire, uploads and DM attachments work.
6. **Dependencies:** validate locked React Query and Playwright packages, Chromium install and smoke tests in exact-head CI.
7. **Moderation:** ensure correct Firebase custom claim, test reports and all consequences using test accounts.
8. **Deployment:** keep the new upgrade PR separate from production until independent acceptance/approval.

**Implemented source ≠ live tested ≠ production ready.**

## R1 upgrade checkpoint
- Removed legacy reel width cap, full viewport desktop/mobile layout, dimensions from media metadata, caption/location/verified/share UI, bounded video mounting, menu actions, pure regression tests.
- NEXT: verify exact head CI and preview; add guarded layout fixture and threaded comments, keyboard controls and remaining R1 acceptance; then R2–R6. No live account acceptance claimed.

## R2 security implementation
Report authorization, UID notification cache keys, module feed cache removal, shared media URL authorization and TTL bounds added. Full route sweep and live two-account acceptance remain open; exact-head CI pending. R1 Avatar size type error corrected.

## Regression repair and initial R3 controls
Fixed actual CI failures (private avatar rule and shared media entrypoint source assertion), added composer location and flags, honored flags in feed, added saved collection navigation and pagination, and made shared response caching explicitly private. Full acceptance remains open.

## Home UI upgrade
Added account-keyed paginated feed, Instagram-inspired media and actions, story composer entry, suggestions follow, notification positioning and floating messages link. CI and signed-in visual acceptance pending.

Home follow-up: added carousel swipe and keyboard navigation, blurred video backdrop, Following filter, repost state hydration, recent chat avatars, navigation profile and More menu, story gradient rings and bounded mutual suggestions. Live acceptance and exact-head CI pending.

Story repair: own story tray links to viewer rather than hiding published items; add button remains separate. Owner-only viewer panel, self-view exclusion, fresh authorized media redirects, and unified black Home/Profile backgrounds implemented. Live publish acceptance pending.

## Realtime integration candidate
Profile separation, notifications presentation and batched seen handling, event-driven chat refresh/typing/unread badge and toast, shell panels, optional FCM registration/delivery/worker added. See docs/REALTIME_QA.md; all live acceptance remains OWNER-VERIFY. Production unchanged; Stream tokens remain explicit opt-in.

## 1stepcloser UI/audio upgrade
Single branch per owner request. Audio defaults to full volume; stories remove mute controls, reels and feed have sliders and browser autoplay fallback. Home has a single infinite feed. Original navigation SVGs, accurate rail width, badge layout, dismissible More menu and shared session UID. Mocked browser checks cover layout and volume property, not actual device audio or live providers. Main untouched.

- Explore page, dropdown search, reel caption placement and monochrome shell mark implemented. Pending: automated CI/preview, real authenticated UI screenshots, legacy thumbnails and upload-time poster pipeline, PNG app icons.
