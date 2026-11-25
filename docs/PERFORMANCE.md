# Performance audit

- Authentication: removed redundant Firebase getUser call, but every protected request still checks revocation, denylist and active profile. No positive authorization cache. This prioritizes security over the proposed five-minute stale authorization window.
- Read quotas: local bounded buckets; Firestore escalation when local capacity is low. Distributed enforcement is approximate. Writes retain durable quotas.
- Chat: WebSocket path unchanged; primary workspace fallback thread checks at 4s and inbox backs off to 30s. Hidden/offline fallback paused. Legacy duplicate reel/notification polls removed. Story and avatar timers 60s, foreground only.
- R2: reuse initialized S3 client per warm instance. Signed URLs and redirect responses remain private/no-store. Extending URL validity or caching authenticated redirects risks cross-account and revoked-access leaks, so not implemented.
- Existing app timing header records total duration; slow routes log request duration without personal information. Granular timings and measured load tests remain outstanding.
- OWNER-VERIFY region: Firebase console > Firestore > Location, Vercel > Settings > Functions > Region. Do not change region until Firestore and R2 locations are confirmed.
