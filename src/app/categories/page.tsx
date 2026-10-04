import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { pageMetadata } from '@/seo/metadata';
import { breadcrumbs, organization } from '@/seo/schema';
import { withBrand } from '@/utils/seo';
import CategoriesPage from '@/views/CategoriesPage';

export const metadata: Metadata = pageMetadata({
  path: '/categories/',
  title: withBrand('Game Categories'),
  description:
    'Browse free online games by category: arcade, puzzle, word, board, card, sports, casual and brain games. Every game plays instantly in your browser.',
});

export default function Page() {
  return (
    <>
      <JsonLd
        graph={[
          organization,
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: 'Categories', path: '/categories/' },
          ]),
        ]}
      />
      <CategoriesPage />
    </>
  );
}
