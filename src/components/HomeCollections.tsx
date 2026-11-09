import { CollectionLinks } from '@/components/CollectionLinks';
import { Section } from '@/components/Section';
import { featuredTopics, playCollections } from '@/data/collections';
import { getPlayableGames } from '@/data/gameCatalog';

/**
 * The home page's topic and collection links. Loaded lazily so every hub's
 * intro and FAQ copy stays out of the main bundle; the prerendered home page
 * carries the same links for crawlers.
 */
export default function HomeCollections() {
  const games = getPlayableGames();
  return (
    <>
      <Section title="Popular Topics">
        <CollectionLinks collections={featuredTopics(games)} label="Popular topics" />
      </Section>

      <Section title="Popular Collections">
        <CollectionLinks collections={playCollections(games)} label="Popular collections" />
      </Section>
    </>
  );
}
