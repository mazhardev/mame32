import { Link } from 'react-router-dom';
import type { CollectionMeta } from '@/data/collections';
import { collectionPath } from '@/data/collections';

interface Props {
  collections: CollectionMeta[];
  label?: string;
}

export function CollectionLinks({ collections, label = 'Game collections' }: Props) {
  if (collections.length === 0) return null;
  return (
    <nav className="link-cloud" aria-label={label}>
      {collections.map((c) => (
        <Link key={c.slug} to={collectionPath(c.slug)}>
          <span aria-hidden="true">{c.icon}</span> {c.name}
        </Link>
      ))}
    </nav>
  );
}
