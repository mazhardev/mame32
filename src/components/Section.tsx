import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  moreHref?: string;
  moreLabel?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Section({ title, moreHref, moreLabel = 'See all', children, action }: Props) {
  return (
    <section>
      <div className="section-head">
        <h2>{title}</h2>
        {action ?? (moreHref && <Link to={moreHref}>{moreLabel} →</Link>)}
      </div>
      {children}
    </section>
  );
}
