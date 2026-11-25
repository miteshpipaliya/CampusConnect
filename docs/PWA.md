# CampusConnect PWA

Install from Chrome's install action or Safari Share → Add to Home Screen. iOS Web Push requires iOS 16.4+ and installation; log in again if the installed app has a separate cookie jar.

## Cache and privacy
| Request | Strategy |
|---|---|
| /_next/static, /pwa-icon, /cc-mark.svg | cache-first public assets |
| /offline | precached public fallback |
| Navigation | network first; offline fallback; no HTML storage |
| APIs, RSC, range, private media, cross-origin | never intercepted or cached |

The root worker is generated from the deployed commit, with optional public Firebase configuration. Push: authenticated user opts in → FCM token → guarded /api/push → caller-owned Firestore subscription → generic data-only push → notification → messages or notifications. No student details in OS notifications. Test push is limited to three per hour. Foreground messages invalidate the existing notification summary. Push is optional; verify configuration and a real device before release.

Updates: worker waits, user selects Refresh, controller changes, reload once. Logout clears the app caches and badge. If a worker is stuck, DevTools Application → Service Workers → Unregister, clear CampusConnect Cache Storage, reload; on iOS remove and reinstall the home screen app if needed. Do not clear other origins.

## QA
CI covers manifest, icon bytes, service worker policy, public fallback and anonymous API response. Manual: Chrome installability; Android safe areas and navigation; iOS 16.4+ install/keyboard; closed-app push and click target; offline cache inspection; second-account isolation after logout; update prompt; desktop visual regression. All device checks require a real device and are not assumed passed.
