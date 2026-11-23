# CampusConnect real-user manual acceptance checklist

**Environment:** staging or a safe preview with staging Firebase, Stream and R2. Never use a production admin account for test abuse reports. Use Account A, Account B and Account C (and a fourth person for group chat).

## Access and identity
- [ ] A signs in with a permitted email and completes profile; verify account session, avatar crop, branch and division.
- [ ] B follows A; profile shows correct posts/followers/following counters. Unfollow and re-follow.
- [ ] Set A to private; B requests access; A approves; B only sees private content after approval.
- [ ] A blocks B; B cannot view A's posts, private media, stories, saved content, profile or create new DM/group with A.

## Posts, comments and saves (Phase 5)
- [ ] A publishes image, multiple-image carousel and a video. B sees public posts and can read media. Verify caption mentions and hashtag counts.
- [ ] B likes/unlikes, comments, replies to A's comment, likes a comment, then deletes their own comment; A can pin one comment and delete inappropriate replies.
- [ ] A turns off commenting; B receives 403 on direct API comment POST, not just a disabled input. A hides like counts and pins up to 3 posts, fourth yields 409.
- [ ] B saves a post into a named collection, filters saves by collection, unsaves it; verify no other account can read those private collections.
- [ ] A edits hashtags, archives/unarchives and deletes a post. Verify follower feed, Explore, tags and counts; inspect `fanoutPartial` for large audiences.
- [ ] B reports a post, comment and account; duplicate report returns alreadyReported. Post link opens a modal via in-app navigation and full page after refresh.

## Stories, Reels, search and notifications (Phases 6–9)
- [ ] A posts campus and close-friends stories; B has access only when authorized, blocked C never does. Story expiry and named highlights remain correct.
- [ ] Create more than 150 active stories across campus; B's followed story tray still shows followed users when latest global stories belong to unrelated people.
- [ ] A uploads landscape, portrait and legacy single-video posts; verify Reels feed, playback controls, media authorization, and one viewer record after 3 seconds.
- [ ] Search by @handle, person name, hashtag and post caption; private profile summaries visible as permitted but blocked users absent. Explore carousel opens its post.
- [ ] Like, comment, reply, repost, follow, accept requests and reply to stories; verify the notifications inbox, grouped activities, mark-all-read and badge `99+`.

## Chat, groups, security
- [ ] A ↔ B exchange text, photo/video, seen receipts, typing, reaction, unsend and shared post; no duplicate or out-of-order messages.
- [ ] Disable `STREAM_CLIENT_TOKENS_ENABLED`; verify REST chat still delivers messages. In staging only, enable the flag and repeat with websocket/live presence and forced reconnect.
- [ ] A creates a group with B and C; exchange messages, rename as owner, verify non-owner cannot rename, verify members can leave, non-members get 404, and blocked users cannot join through group create.
- [ ] Log out while connected; the active Stream session disconnects. Re-login and verify no cross-account client-session leak.
- [ ] Validate private R2 URLs, expired signatures, attachment size/type/duration limits, CORS from authorized hosts only and blocked-user denial.

## Dashboard and admin (Phase 11)
- [ ] A visits B's profile twice in a UTC day; B sees one unique daily profile visit, not two. Story/Reel counters increase only on first valid view.
- [ ] Dashboard 7 and 30 days show correct UTC dates and zeros for empty days, no invented analytics.
- [ ] Without `admin=true` Firebase custom claim, user receives 403 from `/api/admin/reports` and cannot view admin page.
- [ ] Owner sets claim in staging with `scripts/set-admin.mjs`; admin sees queued reports, dismisses, removes test content, disables a test account and checks `adminLog`. Verify recovery after partial auth/database failure.

## Browser and release gates
- [ ] Desktop Chrome, Android Chrome, iOS Safari; story/reel aspect ratios, keyboard/tab navigation, modal Escape and dark theme.
- [ ] Confirm `firestore.indexes.json` indexes are Enabled in staging. Avoid testing a missing index on production.
- [ ] `npm ci`, lint, typecheck, Node tests, audit, Next build and Gitleaks all pass at the **exact final PR head**.
- [ ] Vercel preview is Ready at the same SHA, test all new routes without a cookie (401 JSON), with member cookie, and error states.
- [ ] Only after independent owner/reviewer approval, decide whether to merge PR #34 into production `main`.
