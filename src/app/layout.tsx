import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/global/globals.css';
import React from 'react';
import Script from 'next/script';
import Footer from '@/components/Footer';
import Comments from '@/components/Comments';

const inter = Inter({ subsets: ['latin'] });

const author = 'ooMia';
export const metadata: Metadata = {
  metadataBase: new URL('https://oomia.github.io'),
  title: `${author}'s blog`,
  authors: [
    {
      name: author,
      url: `https://github.com/${author}`
    }
  ],
  description: 'Personal blog',
  icons: '@/resource/favicon.ico',
  applicationName: 'My Portfolio',
  generator: author,
  keywords: [author, 'blog', 'portfolio'],
  creator: author,
  publisher: author
};

metadata.openGraph = {
  type: 'website',
  url: metadata.metadataBase!,
  title: metadata.title!,
  description: metadata.description!,
  siteName: metadata.applicationName!,
  images: [
    {
      url: 'https://oomia.github.io/resource/next.svg'
    }
  ]
};


// https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#root-layout-required
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bg = 'bg-gray-100 dark:bg-gray-900';
  const prose = 'prose dark:prose-invert prose-2xl prose-h1:text-red-400';

  return (
    <html lang="en" className="dark">
    <Script
      src={'https://us.umami.is/script.js'}
      data-website-id="65ec97d8-24c3-4b88-8646-225d81a1cfe4"
      async
    />

    <body className={`${inter.className} mx-auto py-20 px-4 max-w-3xl ${bg} ${prose}`}>
    {children}
    <Comments />
    <Footer />
    </body>
    </html>
  );
}
