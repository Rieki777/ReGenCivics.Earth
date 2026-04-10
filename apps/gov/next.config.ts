import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow images from the main site CDN
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "regencivics.earth" },
      { protocol: "https", hostname: "cdn.regencivics.earth" },
      { protocol: "https", hostname: "assets.regencivics.earth" },
    ],
  },
};

export default nextConfig;
