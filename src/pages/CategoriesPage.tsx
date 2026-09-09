import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { CATEGORIES } from '@/data/categories';
import { countByCategory } from '@/data/gameCatalog';

export default function CategoriesPage() {
  const counts = useMemo(() => countByCategory(), []);

  return (
    <div className="container stack">
      <PageMeta
        title="Categories"
        description="Browse browser games by category: arcade, puzzle, word, board, card, sports, racing, action, strategy, educational, casual, creative and brain games."
      />
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>Categories</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          {CATEGORIES.length} categories covering the whole catalog.
        </p>
      </div>

      <div className="category-grid">
        {CATEGORIES.map((cat) => (
          <Link key={cat.id} to={`/categories/${cat.slug}`} className="category-card">
            <span className="category-icon" aria-hidden="true">
              {cat.icon}
            </span>
            <strong>{cat.name}</strong>
            <span className="tiny muted">{cat.description}</span>
            <span className="tiny faint" style={{ marginTop: 6 }}>
              {counts[cat.id]?.playable ?? 0} playable · {counts[cat.id]?.total ?? 0} in catalog
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
