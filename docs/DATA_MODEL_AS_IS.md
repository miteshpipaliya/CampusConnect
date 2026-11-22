# Firestore data model as-is (Phase 1A)
This inventory documents currently implemented route writes, not the aspirational interfaces in models.ts.
| Collection / path | Writers | Observed fields |
| --- | --- | --- |
| users/{uid} | auth registration, profile/avatar | handle, name, branch, division, privacy, avatarMediaId, relationshipStatus, relationshipVisibility, other registration fields |
| handles/{handle} | auth registration | uid |
| emailOtpChallenges/{digest} | auth | email, codeHash, nonce, expires, lastSent, windowStart, sends, attempts, verified, used, proofHash, proofExpires |
| posts/{id} | POST /api/posts | authorUid, authorHandle, caption, mediaId, visibility, createdAt (server Timestamp) |
| posts/{id}/likes/{uid} | POST /api/posts/[id]/likes | uid, createdAt |
| posts/{id}/comments/{id} | POST /api/posts/[id]/comments | uid, handle, text, createdAt |
| users/{uid}/notifications/{id} | likes/comments | type, actorUid, actorHandle, postId, createdAt |
| reposts/{uid}_{postId} | POST /api/reposts | ownerUid, postId, createdAt |
| stories/{id} | POST/PATCH /api/stories | authorUid, authorHandle, mediaId, contentType, caption, visibility, createdAt, expiresAt, highlight |
| media/{uuid} | POST /api/media reserve/confirm, posts/stories/avatar | ownerUid, key, contentType, size, status, createdAt, postId/storyId/avatarOwnerUid when associated |
| uploadQuotas/{uid}_{date} | POST /api/media reserve | count, updatedAt |
Some other routes may read additional fields. Check route implementation before introducing migrations or composite indexes.
No production database was inspected or modified.
