/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "regencivics.earth" },
      { protocol: "https", hostname: "cdn.regencivics.earth" },
      { protocol: "https", hostname: "assets.regencivics.earth" },
    ],
  },
};

export default nextConfig;
