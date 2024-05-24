import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    'src/**/**.{js,ts,jsx,tsx,mdx}'
  ],
  plugins: [
    require('@tailwindcss/typography')
  ],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px'
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif']
    },
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  }
};
export default config;
