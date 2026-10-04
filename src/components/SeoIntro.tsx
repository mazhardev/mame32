interface Props {
  paragraphs: string[];
}

export function SeoIntro({ paragraphs }: Props) {
  return (
    <div className="seo-intro">
      {paragraphs.map((p) => (
        <p key={p} className="muted small">
          {p}
        </p>
      ))}
    </div>
  );
}
