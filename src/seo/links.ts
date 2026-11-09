import { categoryPath, gamePath } from '@/utils/seo';

/**
 * Links inside copy. Intros, descriptions and FAQ answers are plain strings,
 * so they mark links with a small Markdown-like syntax:
 *
 *   [text](game:<game id>)   → /games/<id>/
 *   [text](hub:<slug>)       → /collections/<slug>/
 *   [text](cat:<slug>)       → /categories/<slug>/
 *
 * The React pages render these as <Link>s, the prerenderer as <a href>s, and
 * anything that needs plain text (meta descriptions, FAQ structured data,
 * share images) strips them. src/data/linking.test.ts checks every target
 * exists, so a typo fails the build instead of shipping a broken link.
 */
export type LinkKind = 'game' | 'hub' | 'cat';

export interface TextPart {
  text: string;
  /** Set when this part is a link. */
  href?: string;
  kind?: LinkKind;
  target?: string;
}

const LINK = /\[([^\]]+)\]\((game|hub|cat):([a-z0-9-]+)\)/g;

export function linkHref(kind: LinkKind, target: string): string {
  if (kind === 'game') return gamePath(target);
  if (kind === 'cat') return categoryPath(target);
  return `/collections/${target}/`;
}

/** Splits copy into plain text and link parts, in order. */
export function parseLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    const kind = m[2] as LinkKind;
    parts.push({ text: m[1], kind, target: m[3], href: linkHref(kind, m[3]) });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** The copy as readers see it, with link markup removed. */
export function plainText(text: string): string {
  return text.replace(LINK, '$1');
}

/** Every link target in a piece of copy. */
export function linkTargets(text: string): { kind: LinkKind; target: string }[] {
  return parseLinks(text)
    .filter((p) => p.kind && p.target)
    .map((p) => ({ kind: p.kind as LinkKind, target: p.target as string }));
}
