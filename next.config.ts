import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/painel-tv",
        destination: "/painel-tv/index.html",
      },
    ];
  },
};

export default nextConfig;
