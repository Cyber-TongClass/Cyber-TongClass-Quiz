/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  async redirects() { return [{source: "/quiz", destination: "/", permanent: true}, {source: "/quiz/:path*", destination: "/:path*", permanent: true}]; },
  async headers() { return [{source: "/:path*", headers: [{key: "X-Robots-Tag", value: "noindex, nofollow"}, {key: "X-Content-Type-Options", value: "nosniff"}, {key: "Referrer-Policy", value: "same-origin"}, {key: "X-Frame-Options", value: "DENY"}]}]; }
};
export default config;
