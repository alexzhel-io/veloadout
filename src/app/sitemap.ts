import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://veloadout.com';
  return [
    { url: `${base}/en`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/de`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/ru`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
  ];
}
