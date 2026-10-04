import { site } from '@/config/site';
import { CATEGORIES, getCategory } from '@/data/categories';
import { activeCollections, collectionDescription, collectionGames, collectionPath } from '@/data/collections';
import { getPlayableGames } from '@/data/gameCatalog';
import type { GameDefinition } from '@/types';
import { absoluteUrl, categoryPath, gamePath } from '@/utils/seo';
import { categoryIntro, categoryLabel, homeFaqs, playersLabel } from './content';

/**
 * llms.txt (https://llmstxt.org) and llms-full.txt: plain-language maps of
 * the site for AI assistants, so they can answer "where can I play X online"
 * or "how do I play X" from a single fetch.
 */

const games = () => [...getPlayableGames()].sort((a, b) => a.title.localeCompare(b.title));
const playableIn = (id: string) => games().filter((g) => g.category === id);
const liveCategories = () => CATEGORIES.filter((c) => playableIn(c.id).length > 0);

function about(count: number): string {
  return `${site.siteName} (${site.siteUrl}) is a free online games website with ${count} games. Every game runs in the web browser with no download, no account and no purchases. Games work on desktop and mobile browsers and offline after the first visit. Scores, achievements and saved games are stored only in the player's own browser. All games, graphics and sounds are original. Board games include a computer opponent with Easy, Normal and Hard levels, and many have a two-player mode on one device.`;
}

export function llmsTxt(): string {
  const all = games();
  return `# ${site.siteName}

> ${site.description}

${about(all.length)}

A longer version with rules and controls for every game is at ${site.siteUrl}/llms-full.txt.

## Games

${all.map((g) => `- [${g.title}](${absoluteUrl(gamePath(g.id))}): ${g.shortDescription} Category: ${getCategory(g.category).name}. Players: ${playersLabel(g)}. Difficulty: ${g.difficulty}.`).join('\n')}

## Categories

${liveCategories()
  .map((c) => `- [${categoryLabel(c)}](${absoluteUrl(categoryPath(c.slug))}): ${c.description}`)
  .join('\n')}

## Collections

${activeCollections(all)
  .map((c) => `- [${c.name}](${absoluteUrl(collectionPath(c.slug))}): ${collectionDescription(c, collectionGames(c, all).length)}`)
  .join('\n')}

## Pages

- [All games](${site.siteUrl}/games/): The full catalog with search and filters.
- [About](${site.siteUrl}/about/): What ${site.siteName} is.
- [Privacy](${site.siteUrl}/privacy/): All player data stays in the browser.
`;
}

function gameMarkdown(g: GameDefinition): string {
  const ins = g.instructions;
  const controls = [
    g.controls.keyboard?.length ? `Keyboard: ${g.controls.keyboard.join('; ')}.` : '',
    g.controls.mouse?.length ? `Mouse: ${g.controls.mouse.join('; ')}.` : '',
    g.controls.touch?.length ? `Touch: ${g.controls.touch.join('; ')}.` : '',
  ].filter(Boolean);
  return [
    `### ${g.title}`,
    '',
    `Play free: ${absoluteUrl(gamePath(g.id))}`,
    `Category: ${getCategory(g.category).name}. Players: ${playersLabel(g)}. Difficulty: ${g.difficulty}. Typical game: about ${g.estimatedMinutes} minutes. Works on: desktop${g.supportsTouch ? ', phones and tablets' : ''}.`,
    '',
    g.fullDescription,
    '',
    `Objective: ${ins.objective}`,
    '',
    'How to play:',
    ...ins.howToPlay.map((step, i) => `${i + 1}. ${step}`),
    ...(ins.scoring ? ['', `Scoring: ${ins.scoring}`] : []),
    ...(ins.difficultyNotes ? ['', `Difficulty levels: ${ins.difficultyNotes}`] : []),
    ...(controls.length ? ['', 'Controls:', ...controls.map((c) => `- ${c}`)] : []),
    ...(ins.tips?.length ? ['', 'Tips:', ...ins.tips.map((t) => `- ${t}`)] : []),
  ].join('\n');
}

export function llmsFullTxt(): string {
  const all = games();
  return `# ${site.siteName} – full game guide

> ${site.description}

${about(all.length)}

${homeFaqs(all.length)
  .map((f) => `Q: ${f.q}\nA: ${f.a}`)
  .join('\n\n')}

${liveCategories()
  .map((c) => `## ${categoryLabel(c)}\n\n${categoryIntro(c).join('\n\n')}\n\n${playableIn(c.id).map(gameMarkdown).join('\n\n')}`)
  .join('\n\n')}
`;
}
