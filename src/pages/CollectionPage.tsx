import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { GameCard } from '@/components/GameCard';
import { FaqSection } from '@/components/FaqSection';
import { SeoIntro } from '@/components/SeoIntro';
import { CollectionLinks } from '@/components/CollectionLinks';
import {
  MIN_COLLECTION_SIZE,
  activeClusters,
  activeCollections,
  collectionDescription,
  collectionGames,
  getCollection,
  relatedCollections,
} from '@/data/collections';
import { getCategory } from '@/data/categories';
import { getPlayableGames } from '@/data/gameCatalog';
import { categoryLabel, hubLinkText } from '@/seo/content';
import { collectionTitle } from '@/utils/seo';

export default function CollectionPage() {
  const { slug = '' } = useParams();
  const collection = getCollection(slug);
  const games = useMemo(
    () => (collection ? collectionGames(collection, getPlayableGames()) : []),
    [collection],
  );
  // A topic hub links to its nearest hubs; a ways-to-play collection links to
  // the other ways to play and to the topics most of its games belong to.
  const others = useMemo(() => {
    const all = getPlayableGames();
    if (!collection) return [];
    if (collection.kind === 'cluster') return relatedCollections(collection, all);
    return activeCollections(all).filter((c) => c.slug !== slug && c.kind !== 'cluster');
  }, [collection, slug]);
  const topics = useMemo(() => {
    if (!collection || collection.kind === 'cluster') return [];
    return activeClusters(getPlayableGames())
      .map((c) => ({ c, n: games.filter((g) => c.includes(g)).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
      .map((x) => x.c);
  }, [collection, games]);

  if (!collection) {
    return (
      <div className="container">
        <PageMeta title="Collection not found" noindex />
        <div className="empty-state">
          <div className="emoji">🤔</div>
          <p>That collection does not exist.</p>
          <Link className="btn" style={{ marginTop: 12 }} to="/games/">
            All games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container stack">
      <PageMeta
        fullTitle={collectionTitle(collection.title)}
        description={collectionDescription(collection, games.length)}
        noindex={games.length < MIN_COLLECTION_SIZE}
      />
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <nav className="small muted" aria-label="Breadcrumb">
          <Link to="/">Home</Link> ·{' '}
          {collection.parent ? (
            <Link to={`/categories/${getCategory(collection.parent).slug}/`}>
              {categoryLabel(getCategory(collection.parent))}
            </Link>
          ) : (
            <Link to="/games/">Games</Link>
          )}{' '}
          · <span>{collection.name}</span>
        </nav>
        <h1 style={{ fontSize: '1.6rem' }}>
          <span aria-hidden="true">{collection.icon}</span> {collection.heading}
        </h1>
        <SeoIntro paragraphs={collection.intro} />
      </div>

      <section aria-label={`${collection.name} (${games.length})`}>
        <div className="section-head">
          <h2>
            {games.length} free {hubLinkText(collection.name)}
          </h2>
        </div>
        <div className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <FaqSection faqs={collection.faqs} />

      {collection.parent && (
        <p className="small">
          Part of{' '}
          <Link className="text-link" to={`/categories/${getCategory(collection.parent).slug}/`}>
            {categoryLabel(getCategory(collection.parent)).toLowerCase()}
          </Link>
          .
        </p>
      )}

      {topics.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Popular topics</h2>
          </div>
          <CollectionLinks collections={topics} label="Popular topics" />
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>{collection.kind === 'cluster' ? 'Related topics' : 'More collections'}</h2>
        </div>
        <CollectionLinks collections={others} label={collection.kind === 'cluster' ? 'Related topics' : 'More collections'} />
      </section>
    </div>
  );
}
