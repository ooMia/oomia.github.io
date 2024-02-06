/**
 * @type {import('next').NextConfig}
 */
const withMDX = require('@next/mdx')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  // https://nextjs.org/docs/app/building-your-application/deploying/static-exports#configuration
  output: 'export'
};

module.exports = withMDX(nextConfig);
