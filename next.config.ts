import type { NextConfig } from "next";
import { redirect } from "next/dist/server/api-utils";
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
};

export default nextConfig;
