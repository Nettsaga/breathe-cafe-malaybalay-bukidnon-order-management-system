import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // PayMongo QR Ph image host
      { protocol: "https", hostname: "**.paymongo.com" },
      { protocol: "https", hostname: "**.paymongo.io" },
      // Unsplash placeholder menu images
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
