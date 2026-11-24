# R2 authorization matrix (partial source review)

| Route | Rule | Status |
|---|---|---|
| reports | visible target, parent membership, non-self, blocked denial | implementation added; OWNER-VERIFY |
| media GET and list signer | same authorization, private avatar, story audience and expiry, archived/deleted post | implementation added; OWNER-VERIFY |
| media upload | session, owner confirmation, size/type/signature | source reviewed; OWNER-VERIFY |
| stories view | authorizedStory | source reviewed; OWNER-VERIFY |
| posts detail/likes/comments, saves, reposts, view, story mutations, highlights, profile, connections, follow, chat, search, explore | full method-by-method verification | OPEN |
