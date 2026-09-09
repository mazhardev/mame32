import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameDefinition } from '@/types';
import { categoryName, getCategory } from '@/data/categories';
import { getBestHighScore, isFavorite, subscribe, toggleFavorite } from '@/storage/StorageService';
import { playSound } from '@/services/audio';
import { formatNumber } from '@/utils/format';

interface Props {
  game: GameDefinition;
  showBest?: boolean;
  subtitle?: string;
}

function GameCardBase({ game, showBest = true, subtitle }: Props) {
  const [fav, setFav] = useState(() => isFavorite(game.id));
  const [best, setBest] = useState<number | null>(null);
  const category = getCategory(game.category);

  useEffect(() => subscribe('favorites', () => setFav(isFavorite(game.id))), [game.id]);

  useEffect(() => {
    if (!showBest || !game.hasHighScore || game.status !== 'available') return;
    let alive = true;
    void getBestHighScore(game.id).then((value) => {
      if (alive) setBest(value);
    });
    return () => {
      alive = false;
    };
  }, [game.id, game.hasHighScore, game.status, showBest]);

  const onFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleFavorite(game.id);
    setFav(now);
    playSound(now ? 'select' : 'click');
  };

  return (
    <article className="game-card">
      <Link to={`/games/${game.id}`} aria-label={`${game.title} — ${categoryName(game.category)}`}>
        <div
          className="game-card-art"
          style={{ '--game-accent': game.accent ?? category.accent } as React.CSSProperties}
        >
          <span aria-hidden="true">{game.icon}</span>
          {game.status === 'planned' && (
            <span className="badge badge-planned card-corner">Planned</span>
          )}
        </div>
        <div className="game-card-body">
          <h3 className="game-card-title">{game.title}</h3>
          <div className="game-card-meta">
            <span>{categoryName(game.category)}</span>
            <span aria-hidden="true">·</span>
            <span className={`badge badge-${game.difficulty}`}>{game.difficulty}</span>
            {game.supportsTouch && (
              <span title="Works on touch screens" aria-label="Touch supported">
                📱
              </span>
            )}
          </div>
          {subtitle ? (
            <div className="game-card-best">{subtitle}</div>
          ) : (
            showBest &&
            best !== null && (
              <div className="game-card-best">
                Best: {formatNumber(best)}
                {game.scoreUnit ? ` ${game.scoreUnit}` : ''}
              </div>
            )
          )}
        </div>
      </Link>
      <button
        className={`fav-btn${fav ? ' on' : ''}`}
        onClick={onFav}
        aria-label={fav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
        aria-pressed={fav}
      >
        {fav ? '♥' : '♡'}
      </button>
    </article>
  );
}

export const GameCard = memo(GameCardBase);
