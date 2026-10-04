import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { site } from '@/config/site';

export default function NotFoundPage() {
  return (
    <div className="container">
      <PageMeta title="Page not found" noindex />
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
          <Link className="btn" to="/games/">
            Browse games
          </Link>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          Followed a broken link? Let us know at{' '}
          <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
        </p>
      </div>
    </div>
  );
}
