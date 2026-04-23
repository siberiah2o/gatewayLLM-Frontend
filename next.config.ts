import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.55.133", "64.44.115.14"],
  async headers() {
    const noStoreHeaders = [
      {
        key: "Cache-Control",
        value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
      {
        key: "Pragma",
        value: "no-cache",
      },
      {
        key: "Expires",
        value: "0",
      },
    ];

    return [
      {
        source: "/",
        headers: noStoreHeaders,
      },
      {
        source: "/login",
        headers: noStoreHeaders,
      },
      {
        source: "/signup",
        headers: noStoreHeaders,
      },
      {
        source: "/dashboard",
        headers: noStoreHeaders,
      },
      {
        source: "/dashboard/:path*",
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
