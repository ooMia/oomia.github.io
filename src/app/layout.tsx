import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import '@/global/globals.css';
import Script from 'next/script';
import React from 'react';

const inter = Inter({subsets: ['latin']});

const author = 'ooMia';
export const metadata: Metadata = {
  metadataBase: new URL('https://oomia.github.io'),
  title: `${author}'s blog`,
  authors: [
    {
      name: author,
      url: `https://github.com/${author}`,
    },
  ],
  description: 'Personal blog',
  icons: '@/resource/favicon.ico',
  applicationName: 'My Portfolio',
  generator: author,
  keywords: [author, 'blog', 'portfolio'],
  creator: author,
  publisher: author,
};

metadata.openGraph = {
  type: 'website',
  url: metadata.metadataBase!,
  title: metadata.title!,
  description: metadata.description!,
  siteName: metadata.applicationName!,
  images: [
    {
      url: 'https://oomia.github.io/resource/next.svg',
    },
  ],
};

// https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#root-layout-required
export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <Script
        src={'https://us.umami.is/script.js'}
        data-website-id="65ec97d8-24c3-4b88-8646-225d81a1cfe4"
        async
      />

      {/*https://nextjs.org/docs/app/building-your-application/optimizing/scripts*/}
      <Script
        src={'https://giscus.app/client.js'}
        data-repo="ooMia/giscus-comments"
        data-repo-id="R_kgDOLFhy6A"
        data-category="Announcements"
        data-category-id="DIC_kwDOLFhy6M4CcdO2"
        data-mapping="pathname"
        data-strict="1"
        data-reactions-enabled="1"
        data-emit-metadata="1"
        data-input-position="top"
        data-theme="dark_high_contrast"
        data-lang="ko"
        data-loading="lazy"
        crossOrigin="anonymous"
        async
        // https://nextjs.org/docs/app/api-reference/components/script#strategy
        strategy="lazyOnload"
      />

      <body className={inter.className}>{children}</body>
    </html>
  );
}
