import type { NextConfig } from "next";
module.exports = {
  async redirects() {
    return [
      {
        source: "/", destination: '/books', permanent: true}];
      },
        
};
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  serverActions: {
    bodySizeLimit: "3mb",
  },
};

export default nextConfig;
