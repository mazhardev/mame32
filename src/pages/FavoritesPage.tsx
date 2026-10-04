import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { GameCard } from '@/components/GameCard';
import { getFavorites, subscribe } from '@/storage/StorageService';
import { getGame } from '@/data/gameCatalog';
import type { GameDefinition } from '@/types';

export default function FavoritesPage() {
  const [games, setGames] = useState<GameDefinition[]>([]);

  useEffect(() => {
    const load = () =>
      setGames(
        getFavorites()
          .map((id) => getGame(id))
          .filter((g): g is GameDefinition => !!g),
      );
    load();
    return subscribe('favorites', load);
  }, []);

  return (
    <div className="container stack">
      <PageMeta title="Favorites" description="Your favorite browser games, saved locally." noindex />
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>Favorites</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          Saved in this browser only — {games.length} game{games.length === 1 ? '' : 's'}.
        </p>
      </div>

      {games.length ? (
        <div className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="emoji">♡</div>
          <p>You have not favorited any games yet.</p>
          <p className="small" style={{ marginTop: 6 }}>
            Tap the heart on any game card to add it here.
          </p>
          <Link className="btn btn-primary" style={{ marginTop: 16 }} to="/games/">
            Browse games
          </Link>
        </div>
      )}
    </div>
  );
}
