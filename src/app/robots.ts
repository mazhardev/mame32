import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export const dynamic = 'force-static';

// Search engines and AI crawlers are explicitly welcome.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'meta-externalagent',
  'DuckAssistBot',
  'MistralAI-User',
  'Googlebot',
  'GoogleOther',
  'Applebot',
  'Amazonbot',
  'YandexBot',
  'DuckDuckBot',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: AI_AGENTS, allow: '/' },
    ],
    sitemap: `${site.siteUrl}/sitemap.xml`,
  };
}
