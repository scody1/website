import type { MetadataRoute } from 'next';

/** /robots.txt — keep the admin panel and APIs out of search engines. */
export default function robots(): MetadataRoute.Robots {
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    ...(site ? { sitemap: `${site}/sitemap.xml`, host: site } : {})
  };
}
