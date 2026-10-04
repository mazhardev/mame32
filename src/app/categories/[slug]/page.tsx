import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import { CATEGORIES, getCategoryBySlug } from '@/data/categories';
import { getGamesByCategory } from '@/data/gameCatalog';
import { categoryFaqs, categoryLabel } from '@/seo/content';
import { pageMetadata } from '@/seo/metadata';
import { breadcrumbs, collectionPage, faqPage, organization } from '@/seo/schema';
import { shareImage } from '@/seo/server';
import { categoryDescription, categoryPath, categoryTitle } from '@/utils/seo';
import CategoryPage from '@/views/CategoryPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategoryBySlug((await params).slug);
  if (!category) return {};
  const games = getGamesByCategory(category.id, true);
  return pageMetadata({
    path: categoryPath(category.slug),
    title: categoryTitle(category.name),
    description: categoryDescription(category.name, category.description, games.length),
    noindex: games.length === 0,
    image: shareImage('categories', category.slug),
    imageAlt: `${categoryLabel(category)} on ${site.siteName}`,
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const games = getGamesByCategory(category.id, true);
  return (
    <>
      <JsonLd
        graph={[
          organization,
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: 'Categories', path: '/categories/' },
            { name: categoryLabel(category), path: categoryPath(category.slug) },
          ]),
          collectionPage(categoryLabel(category), categoryPath(category.slug), games, category.description),
          ...(games.length ? [faqPage(categoryFaqs(category, games))] : []),
        ]}
      />
      <CategoryPage slug={category.slug} />
    </>
  );
}
