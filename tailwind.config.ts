import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    'src/app/**.{js,ts,jsx,tsx,mdx}',
    'src/app/blogs/**.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {},
  plugins: [
    require('@tailwindcss/typography')
  ]
};
export default config;
