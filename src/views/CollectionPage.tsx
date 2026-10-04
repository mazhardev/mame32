'use client';

import { useMemo } from 'react';
import { Link } from '@/components/router';
import { GameCard } from '@/components/GameCard';
import { FaqSection } from '@/components/FaqSection';
import { SeoIntro } from '@/components/SeoIntro';
import { CollectionLinks } from '@/components/CollectionLinks';
import { activeCollections, collectionGames, getCollection } from '@/data/collections';
import { getPlayableGames } from '@/data/gameCatalog';

export default function CollectionPage({ slug }: { slug: string }) {
  const collection = getCollection(slug);
  const games = useMemo(
    () => (collection ? collectionGames(collection, getPlayableGames()) : []),
    [collection],
  );
  const others = useMemo(
    () => activeCollections(getPlayableGames()).filter((c) => c.slug !== slug),
    [slug],
  );

  if (!collection) {
    return (
      <div className="container">
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
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <nav className="small muted" aria-label="Breadcrumb">
          <Link to="/">Home</Link> · <Link to="/games/">Games</Link> · <span>{collection.name}</span>
        </nav>
        <h1 style={{ fontSize: '1.6rem' }}>
          <span aria-hidden="true">{collection.icon}</span> {collection.heading}
        </h1>
        <SeoIntro paragraphs={collection.intro} />
      </div>

      <section aria-label={`${collection.name} (${games.length})`}>
        <div className="section-head">
          <h2>
            {games.length} free {collection.name.toLowerCase()}
          </h2>
        </div>
        <div className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <FaqSection faqs={collection.faqs} />

      <section>
        <div className="section-head">
          <h2>More collections</h2>
        </div>
        <CollectionLinks collections={others} label="More collections" />
      </section>
    </div>
  );
}
