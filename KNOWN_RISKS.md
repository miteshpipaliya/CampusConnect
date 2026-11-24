# CampusConnect — known risks and unresolved release gates

Updated 2026-11-24 for draft PR #34 (`12-adudit`). Old frontend-only demo descriptions are obsolete.

1. **External integration is unverified:** GitHub CI and a Ready Vercel preview cannot send real Stream messages, verify full Firebase permissions or test R2 CORS/private media delivery. Run `docs/MANUAL_QA.md` before production.
2. **Firestore indexes:** `firestore.indexes.json` includes composite post hashtag/createdAt and story author/expiry indexes. Their installation in staging/production is not verified. The story tray has an explicitly bounded fallback when an index is missing, not unlimited scalability.
3. **Stream authorization:** REST 1:1 messaging exists; group-chat server routes are new and need real channel creation, rename, leave, replay, blocking and member-only checks. Client tokens are opt-in by `STREAM_CLIENT_TOKENS_ENABLED`, default false. Live Stream role permission configuration may be different from source assumptions.
4. **Notifications:** Unread summary scans up to 2,500 records for compatibility. It returns `unreadTruncated` when partial and displays `99+` in navigation. Costs and accuracy for very large accounts require server aggregates.
5. **Post fan-out cleanup:** Followers are paged up to 1,000 and successful restoration uses current time, not the original post publish time. `fanoutPartial` reports incomplete reconciliation. Implement a durable queue for accounts exceeding the cap.
6. **Comments:** The list is paged by 80 recent records; nested reply counts and deleted high-volume threads need realistic concurrency testing. Deleting a parent with 399+ replies deliberately returns 409; background batch deletion not implemented.
7. **Analytics:** Daily stats start when feature code is deployed, are not historical, and use UTC days. The dashboard's post scan is capped at 200, so lifetime engagement can undercount larger creators.
8. **Hashtags and search:** Legacy `count` and `postCount` co-exist. Historical data needs reconciliation; trending ranking is page-local; text search scans only a bounded recent set, not global full-text indexing.
9. **Profile verification:** Firebase `emailVerified` plus a BVM email domain is used in audit code; this is not equivalent to an independently audited student identity.
10. **Moderation:** Firebase Auth disable and Firestore audit logs cross separate systems and cannot commit as one atomic transaction. Operator needs reconciliation for partial failures and a verified appeal process. Comment reports must include a parent post ID.
11. **Demo and CSS:** Obsolete demo components and Unsplash CSP references have been removed; CSS sheets remain separated to protect cascade/UI until visual regression tests exist.
12. **Testing infrastructure:** `@tanstack/react-query` and `@playwright/test` are not in package dependencies/lockfile. React Query provider and Playwright CI are not implemented. Add together in a separate validated tooling commit after lockfile regeneration.
13. **No production release:** Audit branch is draft PR #34. Source on `main` is not modified by this audit. Do not merge until newest CI+Vercel preview and independent real-account staging QA pass.

## R2 dependency gate
Owner dependency update not observed: firebase-admin 13.6.0 remains locked. Previous audit reported moderate uuid advisory through gaxios/google-gax/teeny-request/retry-request/Firestore/Storage and minimatch through typescript-eslint. Do not claim a clean production audit until npm audit --omit=dev is run on the updated lockfile.
