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
};

export default nextConfig;
