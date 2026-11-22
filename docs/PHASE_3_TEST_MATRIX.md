# Phase 3 multi-account security acceptance matrix

Status: **not executed**. Use isolated Firebase test accounts A (public), B (private), C (outsider), D (blocked). Do not use production user data.

| Scenario | Action | Expected |
|---|---|---|
| Unauthenticated | GET follow, requests, connections, suggestions | 401 |
| A follows B | POST /api/follow | pending, B receives request |
| B accepts A | POST /api/follow-requests | active, A receives notification |
| C views B | profile, posts, media, stories, followers | no private content or signed URLs |
| B blocks A | POST /api/blocks | both follows removed, media and profiles inaccessible in both directions |
| A attempts blocked follow | POST /api/follow | 403 |
| B unblocks A | DELETE /api/blocks | follows must not be restored |
| A mutes B posts | POST /api/mutes | B posts excluded from A feed |
| A mutes B stories | POST /api/mutes | B stories excluded from A stories |
| Close friends | B posts close-only story | only approved close friends can access story media |
| A removes photo | DELETE /api/profile/avatar | avatar removed, stale avatar URL not authorized |
| Deleted post | GET /api/media and signed URL minting | inaccessible |
| Cross-user request acceptance | C attempts to accept B's request | 404, no mutation |
| Blocked suggestions | A blocks C | C absent from A suggestions |
| Deleted user | request/suggestions | excluded |
| Stream chat block | B blocks A | verify Stream native block sync and deny messaging |
| Multi-device session | logout/relogin | follow status and counts persist |

Automate against Firebase emulator and mock R2/Stream; verify Firestore indexes and rate limits. CI green, preview smoke, and human security review are required before merging.
