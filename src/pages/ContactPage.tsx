import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { site } from '@/config/site';
import { bugReportMailto, gameRequestMailto, supportMailto } from '@/utils/support';

const CHANNELS = [
  {
    icon: '🐞',
    title: 'Report a bug',
    text: 'Something not working as it should? Tell us which game, what happened and which device and browser you were using, and we will look into it.',
    action: 'Report a bug',
    href: bugReportMailto(),
  },
  {
    icon: '🎮',
    title: 'Request a game',
    text: 'Is there a game you would love to play here? Send us the name or the idea — player suggestions help decide what we build next.',
    action: 'Suggest a game',
    href: gameRequestMailto(),
  },
  {
    icon: '✉️',
    title: 'General enquiries',
    text: 'Feedback, accessibility issues, partnership or press questions — every message is read.',
    action: 'Send a message',
    href: supportMailto(`Enquiry: ${site.siteName}`),
  },
];

export default function ContactPage() {
  return (
    <div className="container stack" style={{ maxWidth: 780 }}>
      <PageMeta
        title="Contact & Support"
        description={`Contact ${site.siteName} support: report a bug, request a new game or send feedback. Email ${site.supportEmail}.`}
      />
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>Contact &amp; Support</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          We want every game on {site.siteName} to work well on every device. If you run into a
          problem or have an idea, we would like to hear from you.
        </p>
      </div>

      <div className="card stack" style={{ gap: 'var(--space-3)' }}>
        <div className="tiny faint">SUPPORT EMAIL</div>
        <a className="contact-email" href={`mailto:${site.supportEmail}`}>
          {site.supportEmail}
        </a>
        <p className="muted small">
          Please include the game name and your device and browser when reporting a problem —
          it helps us reproduce and fix it quickly.
        </p>
      </div>

      <div className="contact-grid">
        {CHANNELS.map((c) => (
          <section key={c.title} className="card stack" style={{ gap: 'var(--space-3)' }}>
            <div className="contact-icon" aria-hidden="true">
              {c.icon}
            </div>
            <h2 style={{ fontSize: '1.05rem' }}>{c.title}</h2>
            <p className="muted small" style={{ flex: 1 }}>
              {c.text}
            </p>
            <a className="btn" href={c.href}>
              {c.action}
            </a>
          </section>
        ))}
      </div>

      <div className="card stack" style={{ gap: 'var(--space-3)' }}>
        <h2 style={{ fontSize: '1.05rem' }}>Before you write</h2>
        <ul className="muted small">
          <li>
            Most display problems are fixed by reloading the page. If a game misbehaves after an
            update, a hard refresh (Ctrl + Shift + R, or ⌘ + Shift + R on a Mac) loads the latest
            version.
          </li>
          <li>
            Your scores and progress are stored only in your browser, so we cannot restore them for
            you. Use Settings → Export Save Data to keep a backup.
          </li>
          <li>
            Writing to us opens your own email app. This site does not collect your email address or
            any other personal details — see the <Link to="/privacy/">privacy page</Link>.
          </li>
        </ul>
      </div>
    </div>
  );
}
