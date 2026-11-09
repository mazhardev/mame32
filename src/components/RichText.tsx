import { Link } from 'react-router-dom';
import { parseLinks } from '@/seo/links';

/** Copy with [text](game:id)-style links rendered as router links. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseLinks(text).map((part, i) =>
        part.href ? (
          <Link key={i} to={part.href} className="text-link">
            {part.text}
          </Link>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
