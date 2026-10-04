import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import { pageMetadata } from '@/seo/metadata';
import { organization } from '@/seo/schema';
import { withBrand } from '@/utils/seo';
import PrivacyPage from '@/views/PrivacyPage';

export const metadata: Metadata = pageMetadata({
  path: '/privacy/',
  title: withBrand('Privacy'),
  description: `How ${site.siteName} stores your data: game progress, scores, achievements and preferences stay in your own browser. No account is required.`,
});

export default function Page() {
  return (
    <>
      <JsonLd graph={[organization]} />
      <PrivacyPage />
    </>
  );
}
