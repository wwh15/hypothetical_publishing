import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/books",
        permanent: true,
      },
    ];
  },
  reactCompiler: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  serverActions: {
    bodySizeLimit: "3mb",
  },
};

export default nextConfig;
