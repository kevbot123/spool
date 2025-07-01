import React from 'react';
import Head from 'next/head';

interface SpoolSEOProps {
  content: any;
  collection: string;
  path: string;
  siteUrl?: string;
}

export function SpoolSEO({ content, collection, path, siteUrl = '' }: SpoolSEOProps) {
  const title = content.seoTitle || content.title || 'Untitled';
  const description = content.seoDescription || content.excerpt || '';
  const canonicalUrl = content.canonicalUrl || `${siteUrl}${path}`;
  const ogImage = content.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(title)}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={canonicalUrl} />
      {content.noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Head>
  );
} 