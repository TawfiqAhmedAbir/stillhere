/** @type {import('next').NextConfig} */
const rawBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
const basePath =
  rawBase && !rawBase.startsWith("/") ? `/${rawBase}` : rawBase;

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
