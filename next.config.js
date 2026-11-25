/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https://*.stream-io-cdn.com https://*.r2.cloudflarestorage.com data: blob:; media-src 'self' https://*.stream-io-cdn.com https://*.r2.cloudflarestorage.com data: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://www.gstatic.com/firebasejs/13.4.0/; worker-src 'self'; connect-src 'self' https://chat.stream-io-api.com wss://chat.stream-io-api.com https://*.r2.cloudflarestorage.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://fcm.googleapis.com; upgrade-insecure-requests" },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];
const nextConfig = {
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ['lucide-react'] },
  images: { remotePatterns: [] },
  async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; },
};
module.exports = nextConfig;
