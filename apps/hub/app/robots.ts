import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/private/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'Googlebot',
          'Bingbot',
          'cohere-ai',
          'CCBot',
          'Bytespider',
          'Applebot',
        ],
        allow: '/',
      },
    ],
    sitemap: 'https://mim-hub.vercel.app/sitemap.xml',
  };
}
