import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { GameCard } from '@/components/GameCard';
import { getCategoryBySlug } from '@/data/categories';
import { getGamesByCategory } from '@/data/gameCatalog';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const category = getCategoryBySlug(slug);
  const games = useMemo(() => (category ? getGamesByCategory(category.id) : []), [category]);

  if (!category) {
    return (
      <div className="container">
        <PageMeta title="Category not found" />
        <div className="empty-state">
          <div className="emoji">🤔</div>
          <p>That category does not exist.</p>
          <Link className="btn" style={{ marginTop: 12 }} to="/categories">
            All categories
          </Link>
        </div>
      </div>
    );
  }

  const playable = games.filter((g) => g.status === 'available');
  const planned = games.filter((g) => g.status === 'planned');

  return (
    <div className="container stack">
      <PageMeta title={`${category.name} Games`} description={category.description} />
      <div>
        <Link className="small muted" to="/categories">
          ← All categories
        </Link>
        <h1 style={{ fontSize: '1.6rem', marginTop: 8 }}>
          <span aria-hidden="true">{category.icon}</span> {category.name}
        </h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          {category.description}
        </p>
      </div>

      {playable.length > 0 ? (
        <div className="game-grid">
          {playable.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="emoji">🚧</div>
          <p>No games in this category are playable yet.</p>
        </div>
      )}

      {planned.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Planned ({planned.length})</h2>
          </div>
          <div className="game-grid">
            {planned.map((game) => (
              <GameCard key={game.id} game={game} showBest={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
