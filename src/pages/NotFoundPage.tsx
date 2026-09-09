import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';

export default function NotFoundPage() {
  return (
    <div className="container">
      <PageMeta title="Page not found" />
      <div className="empty-state">
        <div className="emoji">🕹️</div>
        <h1 style={{ fontSize: '1.4rem' }}>Page not found</h1>
        <p className="small" style={{ marginTop: 8 }}>
          The page you were looking for does not exist.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link className="btn btn-primary" to="/">
            Go home
          </Link>
          <Link className="btn" to="/games">
            Browse games
          </Link>
        </div>
      </div>
    </div>
  );
}
