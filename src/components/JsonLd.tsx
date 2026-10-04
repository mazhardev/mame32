/** Server-rendered JSON-LD block. JSON inside <script> must not be able to close the tag. */
export function JsonLd({ graph }: { graph: object[] }) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
