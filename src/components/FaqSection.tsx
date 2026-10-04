import type { Faq } from '@/seo/content';

interface Props {
  faqs: Faq[];
  title?: string;
}

/**
 * Visible FAQ. The prerendered page carries matching FAQPage structured data,
 * which search engines only honour when the answers are on the page.
 */
export function FaqSection({ faqs, title = 'Frequently asked questions' }: Props) {
  if (faqs.length === 0) return null;
  return (
    <section className="card faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
        {title}
      </h2>
      {faqs.map((f) => (
        <details key={f.q} className="faq-item">
          <summary>
            <h3>{f.q}</h3>
          </summary>
          <p className="small muted">{f.a}</p>
        </details>
      ))}
    </section>
  );
}
