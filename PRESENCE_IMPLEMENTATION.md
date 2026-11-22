# Stream presence implementation and acceptance

Status: **IN PROGRESS — NOT PRODUCTION READY**

## Existing integrations
- Firebase Admin cookie session in `src/lib/server/session.ts`.
- Stream REST chat in `src/app/api/chat/route.ts`.
- Session-authenticated token endpoint in `src/app/api/chat/token/route.ts`, disabled unless `STREAM_CLIENT_TOKENS_ENABLED=true`.
- Firestore `settings.activityStatus` is an existing user preference.
- Shared `OnlineIndicator` and authorization endpoint `GET /api/chat/presence?uids=<comma-separated-UIDs>` added in this branch.

## Security contract
- Presence must be sourced from authenticated Stream SDK connections, not a Firestore online flag or profile visits.
- `/api/chat/presence` returns **permission only**, not online status. The client must intersect this permission with live Stream user presence.
- Both viewer and target must enable activity status; block/deletion deny visibility.
- Stream API secret must remain server-side.
- Keep client tokens disabled until explicitly approved after review.
- Existing Stream direct-channel REST routes enforce local bilateral blocks, but Stream client-side channel authorization and permission configuration need independent audit before enabling tokens.

## Outstanding tasks
1. Verify `stream-chat` and `stream-chat-react` compatibility with React 19/Next 15; regenerate and commit npm lockfile using npm, verify `npm ci`.
2. Build a single authenticated Stream client provider, with cleanup, reconnect, token renewal and session expiry behavior.
3. Subscribe to presence events and channel member presence; authorize visibility on the server and never leak presence via unfiltered Stream client user objects.
4. Wire shared indicator into inbox, conversations, chat header, search and profile avatars.
5. Build complete messaging routes, messages, typing, receipts, actions, media, post/reel sharing, notification integration and privacy enforcement.
6. Add Stream SDK mock tests and live two-account/multiple-device test evidence; confirm both privacy and blocked-account behavior.
7. Complete prior content pipeline upgrade PR #20 and remaining upgrade batches; run CI, preview and production-safe smoke tests before merging.

## Deployment
**Do not merge or enable `STREAM_CLIENT_TOKENS_ENABLED` yet.** The SDK client and full security verification are not implemented.

## 2026-11-22 implementation checkpoint
- Implemented REST-backed `/messages` inbox and `/messages/[id]` conversation views using existing session-protected `/api/chat`, plus navigation links. Supports text send, copy, own-message unsend and per-user removal through existing endpoints. This is **not realtime**; there is no client Stream SDK connection or event subscription yet.
- New presence visibility endpoint and shared green indicator are implemented but **not wired to Stream events or avatars**. No false online state is rendered.
- Container cannot resolve github.com for cloning, so local `npm ci`, TypeScript, lint, tests and build could not be run. GitHub Actions runs were not available for this branch at checkpoint; Vercel preview build was in progress, not verified.
- Missing: compatible SDK dependency and lockfile, real-time messages/presence/typing/receipts, pagination, replies/reactions, secure media and content sharing, notifications, two-account acceptance tests. Do not enable Stream client tokens or merge to production.
NEXT: Inspect latest Vercel preview build and GitHub Actions quality results for branch upgrade/stream-dm-presence; fix errors, regenerate lockfile, integrate official Stream SDK and complete remaining DM requirements before production merge.
