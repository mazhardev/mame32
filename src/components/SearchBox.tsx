import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGames } from '@/data/gameCatalog';
import { categoryName } from '@/data/categories';

interface Props {
  placeholder?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

export function SearchBox({ placeholder = 'Search games…', autoFocus, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => searchGames(query, 8), [query]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    setQuery('');
    onNavigate?.();
    navigate(`/games/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) {
      if (e.key === 'Enter' && query.trim()) {
        setOpen(false);
        onNavigate?.();
        navigate(`/games?q=${encodeURIComponent(query.trim())}`);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[highlight].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="header-search" ref={wrapRef}>
      <span className="search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        className="input input-search"
        type="search"
        value={query}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search games"
        aria-expanded={open && results.length > 0}
        role="combobox"
        aria-controls="search-results"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && query.trim().length > 0 && (
        <div
          id="search-results"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 80,
          }}
        >
          {results.length === 0 ? (
            <div className="small muted" style={{ padding: '12px 14px' }}>
              No games match “{query}”.
            </div>
          ) : (
            results.map((game, i) => (
              <button
                key={game.id}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(game.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 13px',
                  textAlign: 'left',
                  background: i === highlight ? 'var(--surface-hover)' : 'transparent',
                }}
              >
                <span style={{ fontSize: '1.15rem' }} aria-hidden="true">
                  {game.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 550 }}>
                    {game.title}
                  </span>
                  <span className="tiny muted">{categoryName(game.category)}</span>
                </span>
                {game.status === 'planned' && <span className="badge badge-planned">Planned</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
