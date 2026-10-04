'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/components/router';
import { getConsent, onConsentChange, setConsent } from '@/services/analytics';

/** Small, non-blocking bar asking whether anonymous usage statistics may use cookies. */
export function ConsentBanner() {
  // 'unknown' until mounted: the pre-rendered page must not show the banner.
  const [choice, setChoice] = useState<ReturnType<typeof getConsent> | 'unknown'>('unknown');
  useEffect(() => {
    setChoice(getConsent());
    return onConsentChange(() => setChoice(getConsent()));
  }, []);
  if (choice !== null) return null;
  return (
    <div className="consent-banner" role="region" aria-label="Analytics consent">
      <p>
        We use Google Analytics cookies to count visits and see which games are popular. Your game data stays in your browser.{' '}
        <Link to="/privacy/">Privacy</Link>
      </p>
      <div className="consent-actions">
        <button type="button" className="btn" onClick={() => setConsent('denied')}>
          No thanks
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setConsent('granted')}>
          Allow
        </button>
      </div>
    </div>
  );
}
