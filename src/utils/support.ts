import { site } from '@/config/site';

/**
 * mailto: links for the support address, pre-filled with a subject and a
 * short template so reports arrive with the details needed to act on them.
 * Nothing is sent by the site itself — the visitor's own mail app opens.
 */
export function supportMailto(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${site.supportEmail}?${params.join('&')}`;
}

export function bugReportMailto(gameTitle?: string, extra?: string): string {
  const subject = gameTitle ? `Bug report: ${gameTitle}` : `Bug report: ${site.siteName}`;
  return supportMailto(
    subject,
    [
      'Hello,',
      '',
      `I found a problem${gameTitle ? ` in ${gameTitle}` : ''} on ${site.siteName}.`,
      '',
      'What happened:',
      '',
      'What I expected:',
      '',
      'Steps to reproduce:',
      '1. ',
      '',
      'Device and browser (e.g. iPhone 15, Safari):',
      ...(extra ? ['', extra] : []),
    ].join('\n'),
  );
}

export function gameRequestMailto(): string {
  return supportMailto(
    `Game request: ${site.siteName}`,
    ['Hello,', '', 'I would like to see this game added:', '', 'Game name or idea:', '', 'Why I would enjoy it:', ''].join('\n'),
  );
}
