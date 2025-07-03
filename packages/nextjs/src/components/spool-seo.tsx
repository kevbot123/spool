import React from 'react';
import Head from 'next/head';

interface SpoolSEOProps {
  content: any;
  collection: string;
  path: string;
  siteUrl?: string;
}

/**
 * SEO component for Pages Router
 * @deprecated Use generateSpoolMetadata for App Router instead
 */
export function SpoolSEO({ content, collection, path, siteUrl = '' }: SpoolSEOProps) {
  const title = content.data?.seoTitle || content.data?.title || 'Untitled';
  const description = content.data?.seoDescription || content.data?.description || content.data?.excerpt || '';
  const canonicalUrl = content.data?.canonicalUrl || `${siteUrl}${path}`;
  const ogImage = content.data?.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(title)}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={content.data?.ogTitle || title} />
      <meta property="og:description" content={content.data?.ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={canonicalUrl} />
      {content.data?.noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Head>
  );
} 