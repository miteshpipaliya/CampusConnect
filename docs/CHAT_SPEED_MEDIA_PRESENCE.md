# Chat speed, presence and media upload — release acceptance

## What changed
- Text messages appear in the sender's thread immediately with a pending status. The API returns an actual Stream message ID on success and preserves failed text for retry. No database records are fabricated.
- The Next.js send endpoint still verifies session, recipient, blocks and Stream channel membership. It does not perform two redundant Stream user upserts on each write. Notification work is scheduled with Next.js `after()` instead of holding the send response.
- Stream v10 typing indicators use `channel.keystroke()` and `channel.stopTyping()` directly on a watched, authenticated channel; green typing text appears under the person's name and above the chat composer, not in a message bubble.
- The green dot on the avatar requires **both** students to opt into Settings > Account Privacy > Activity Status, Stream presence online, and server authorization. Socket connectivity alone does not reveal another person's status.
- Message menu buttons are positioned absolutely; they no longer occupy a full extra row between every message.
- Direct signed R2 PUT remains preferred, with a strictly authenticated, same-origin <=3 MiB fallback for chat attachments. Large files rely on R2 CORS.
- The chat is marked `Live` only when the Stream socket AND the active messaging channel watch succeed. Otherwise authenticated refresh continues.

## R2 CORS (manual, once per bucket)
Cloudflare Dashboard > R2 Object Storage > your chat media bucket > Settings > CORS Policy.
Add / merge the following rule with any existing rules (do not overwrite policies serving other apps):
```json
[
  {
    "AllowedOrigins": ["https://campusconnectbvm.online"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
If preview deployments need uploads, add the exact *specific* preview origin as a second AllowedOrigin; do not use an unrestricted wildcard.
The browser's direct PUT sends the signed URL and the exact reserved `Content-Type`.
Presigned URLs expire after 90 seconds. Re-select a large file if an older reserved URL has expired.

## Two-account acceptance tests — required before claiming fully reliable production chat
1. Student A and B are signed in on separate devices/browsers; both open the same DM, Stream role policies restrict access to members.
2. Both have voluntarily enabled Activity Status. Confirm the correct peer green dot appears under avatar only when online, disappears offline, and is hidden when either disables status.
3. Type on A; B sees green "Typing…" outside the chat bubbles and in the conversation sidebar; it clears on stop.
4. Send 10 messages each direction. Verify compact spacing, no duplicated optimistic bubbles, reliable delivered/seen timestamps, and no lost messages on reconnect.
5. Upload PNG/JPG/WebP under 3 MiB (works through proxy if R2 CORS is broken), images up to 8 MiB, and permitted videos up to 50 MiB (requires R2 direct PUT/CORS). Send to B, then test viewing, unsend, and blocked-user denial.
6. Confirm a third nonmember cannot watch the channel, download another user's private attachment, or bypass blocks with a browser Stream token.
7. Inspect Network failures for `/api/media`, `/api/media/upload`, `/api/chat`, and failed `*.r2.cloudflarestorage.com` PUT. Do not upload cookies/tokens or expose signed URLs in screenshots.
8. Check exact GitHub and Vercel production commit, run CI, and inspect production runtime logs for any outstanding errors.

If a video over 3 MiB fails, *first* validate the R2 CORS rule and signed PUT in the browser Network panel. The server-side small-media fallback cannot proxy large videos because of Vercel's function-body limit.
