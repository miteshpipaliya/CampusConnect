# CampusConnect Engineering Decisions

## 2026-11-21 — Isolated upgrade branch
- All force-upgrade changes belong on `codewithclaude`. Do not push upgrade work to `main` or trigger production deployments until verified and approved.
- Preserve the existing Firebase session-cookie flow, Firestore Admin SDK access, private R2 objects, Stream integration, and current student data.
- The initial `models.ts` and `firestore.indexes.json` are preliminary schema definitions, not deployed migrations or verified completed functionality. Keep Phase 1.1 DOING until the required checks pass and the indexes are reviewed against actual queries.
- The current `GET /api/posts` reads up to 30 posts, then separately counts likes, counts comments, and checks the current user's like for each post. Replace this N+1 pattern with denormalized transactional counters and batched lookups while retaining compatibility with legacy documents.
- The repository's `package.json` exposes `typecheck`, `lint`, `test`, and `build` commands. All four are mandatory verification gates before an implementation item can be marked DONE.
- The local working environment cannot resolve `github.com` for a clone, so no local dependency install, typecheck, lint, test or production build can currently be asserted. GitHub file API commits do not substitute for verification.
- The original prompt directs pushes to `main`, but the user's newer explicit instruction overrides that: commit only to `codewithclaude`.
- External actions (Firebase index deployment, R2 CORS, Stream console settings, production environment variables) remain blocked until executed and verified in their respective services.
