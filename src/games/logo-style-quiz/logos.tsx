/**
 * Original, fictional brands. Names were chosen to avoid real companies; the
 * icons are simple geometric drawings made for this game.
 */
export interface Brand {
  name: string;
  business: string;
  color: string;
  level: 1 | 2 | 3;
  /** SVG markup in a 64×64 box, drawn in currentColor. */
  icon: string;
}

export const BRANDS: Brand[] = [
  {
    name: 'Evergreen Gardens',
    business: 'a garden centre',
    color: '#2e9d44',
    level: 1,
    icon: '<path d="M14 50C14 26 30 12 52 12C52 36 38 52 14 50Z"/><path d="M14 50L38 26" stroke="#fff" stroke-width="3" fill="none"/>',
  },
  {
    name: 'Clearwater Springs',
    business: 'a bottled water company',
    color: '#1e88e5',
    level: 1,
    icon: '<path d="M32 6C44 24 50 33 50 42A18 18 0 0 1 14 42C14 33 20 24 32 6Z"/>',
  },
  {
    name: 'Voltline Electric',
    business: 'an electrician',
    color: '#f5a300',
    level: 1,
    icon: '<path d="M36 4L12 36H30L26 60L52 26H34Z"/>',
  },
  {
    name: 'Brickhaven Homes',
    business: 'a home builder',
    color: '#c0392b',
    level: 1,
    icon: '<path d="M8 30L32 8L56 30V56H8Z"/><rect x="26" y="38" width="12" height="18" fill="#fff"/>',
  },
  {
    name: 'Melody Lane Music',
    business: 'a music school',
    color: '#8e44ad',
    level: 1,
    icon: '<ellipse cx="20" cy="48" rx="10" ry="8"/><rect x="26" y="10" width="5" height="38"/><path d="M31 10C42 14 48 20 46 30C44 24 38 20 31 20Z"/>',
  },
  {
    name: 'Tidewave Surf School',
    business: 'surfing lessons',
    color: '#0097a7',
    level: 1,
    icon: '<path d="M4 40C14 26 24 26 32 36C38 44 48 44 60 34V58H4Z"/><path d="M20 32C24 20 36 14 46 20C38 20 32 26 30 34Z"/>',
  },
  {
    name: 'Summit Trail Outfitters',
    business: 'a hiking gear shop',
    color: '#546e7a',
    level: 1,
    icon: '<path d="M4 54L24 20L34 34L42 24L60 54Z"/><path d="M24 20L29 28L20 28Z" fill="#fff"/>',
  },
  {
    name: 'Sunbeam Solar',
    business: 'a solar panel installer',
    color: '#f39c12',
    level: 1,
    icon: '<circle cx="32" cy="32" r="12"/><g stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M32 4V12M32 52V60M4 32H12M52 32H60M12 12L18 18M46 46L52 52M12 52L18 46M46 18L52 12"/></g>',
  },
  {
    name: 'Ember Grill House',
    business: 'a barbecue restaurant',
    color: '#e8590c',
    level: 1,
    icon: '<path d="M32 4C40 18 50 26 48 42A16 16 0 0 1 16 42C14 32 22 26 26 16C28 24 32 26 34 26C34 18 33 12 32 4Z"/>',
  },
  {
    name: 'Pageturner Books',
    business: 'a bookshop',
    color: '#6d4c41',
    level: 1,
    icon: '<path d="M6 14C16 10 26 12 31 18V56C26 50 16 48 6 52Z"/><path d="M58 14C48 10 38 12 33 18V56C38 50 48 48 58 52Z"/>',
  },
  {
    name: 'Pawfect Pet Care',
    business: 'a vet and pet groomer',
    color: '#d35400',
    level: 1,
    icon: '<ellipse cx="32" cy="42" rx="14" ry="12"/><circle cx="14" cy="26" r="6"/><circle cx="26" cy="14" r="6"/><circle cx="38" cy="14" r="6"/><circle cx="50" cy="26" r="6"/>',
  },
  {
    name: 'Morning Mug Café',
    business: 'a coffee shop',
    color: '#795548',
    level: 1,
    icon: '<path d="M10 26H46V44A12 12 0 0 1 34 56H22A12 12 0 0 1 10 44Z"/><path d="M46 30H52A7 7 0 0 1 52 44H46" fill="none" stroke="currentColor" stroke-width="4"/><path d="M20 20C18 14 24 12 22 6M32 20C30 14 36 12 34 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  },
  {
    name: 'Pulsepoint Clinic',
    business: 'a medical clinic',
    color: '#e53935',
    level: 2,
    icon: '<path d="M32 56C12 42 4 30 8 18C12 8 26 6 32 16C38 6 52 8 56 18C60 30 52 42 32 56Z"/><path d="M8 32H22L27 24L33 40L38 30H56" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>',
  },
  {
    name: 'Twistkey Locksmiths',
    business: 'a locksmith',
    color: '#b8860b',
    level: 2,
    icon: '<circle cx="18" cy="32" r="12"/><circle cx="18" cy="32" r="5" fill="#fff"/><rect x="28" y="28" width="30" height="8"/><rect x="46" y="36" width="5" height="10"/><rect x="38" y="36" width="5" height="7"/>',
  },
  {
    name: 'Guardwell Insurance',
    business: 'an insurance company',
    color: '#283593',
    level: 2,
    icon: '<path d="M32 4L56 12V30C56 44 46 54 32 60C18 54 8 44 8 30V12Z"/><path d="M22 32L30 40L44 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  {
    name: 'Starlaunch Aerospace',
    business: 'a rocket company',
    color: '#37474f',
    level: 2,
    icon: '<path d="M32 4C42 14 44 28 40 44H24C20 28 22 14 32 4Z"/><circle cx="32" cy="24" r="5" fill="#fff"/><path d="M24 36L14 48L24 46ZM40 36L50 48L40 46Z"/><path d="M26 46L32 60L38 46Z" fill="#ff7043"/>',
  },
  {
    name: 'Brushstroke Studio',
    business: 'an art studio',
    color: '#ad1457',
    level: 2,
    icon: '<path d="M44 6L58 20L30 40L24 34Z"/><path d="M22 36L28 42C26 52 16 58 6 58C12 52 10 40 22 36Z"/>',
  },
  {
    name: 'Fixright Repairs',
    business: 'a repair shop',
    color: '#455a64',
    level: 2,
    icon: '<path d="M44 4A14 14 0 0 0 30 22L6 46A6 6 0 0 0 18 58L42 34A14 14 0 0 0 60 20L50 26L42 22L38 14Z"/>',
  },
  {
    name: 'Finley’s Fish Market',
    business: 'a seafood market',
    color: '#00838f',
    level: 2,
    icon: '<path d="M4 32C14 18 34 14 48 28L60 18V46L48 36C34 50 14 46 4 32Z"/><circle cx="16" cy="30" r="3" fill="#fff"/>',
  },
  {
    name: 'Skyhop Airlines',
    business: 'an airline',
    color: '#1565c0',
    level: 2,
    icon: '<path d="M58 8C52 6 46 10 40 16L30 26L10 20L6 24L24 34L16 44L8 42L6 46L16 50L20 60L24 58L22 50L32 42L42 60L46 56L40 36L50 26C56 20 60 14 58 8Z"/>',
  },
  {
    name: 'Polar Breeze Cooling',
    business: 'an air-conditioning company',
    color: '#039be5',
    level: 3,
    icon: '<g stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"><path d="M32 4V60M8 18L56 46M8 46L56 18"/><path d="M26 8L32 14L38 8M26 56L32 50L38 56"/></g>',
  },
  {
    name: 'Cogwise Engineering',
    business: 'an engineering firm',
    color: '#616161',
    level: 3,
    icon: '<path d="M28 4H36L38 12L44 14L50 9L55 14L50 20L52 26L60 28V36L52 38L50 44L55 50L50 55L44 50L38 52L36 60H28L26 52L20 50L14 55L9 50L14 44L12 38L4 36V28L12 26L14 20L9 14L14 9L20 14L26 12Z"/><circle cx="32" cy="32" r="9" fill="#fff"/>',
  },
  {
    name: 'Wishstar Toys',
    business: 'a toy shop',
    color: '#fbc02d',
    level: 3,
    icon: '<path d="M32 4L40 23L60 24L44 37L50 58L32 46L14 58L20 37L4 24L24 23Z"/>',
  },
  {
    name: 'Crumb & Crust Bakery',
    business: 'a bakery',
    color: '#c68642',
    level: 3,
    icon: '<path d="M8 40C8 24 20 14 32 14C44 14 56 24 56 40V50H8Z"/><path d="M20 26L24 38M32 22V36M44 26L40 38" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  },
];

export function Logo({
  brand,
  size = 110,
  showName = false,
}: {
  brand: Brand;
  size?: number;
  showName?: boolean;
}) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.24,
          background: `${brand.color}22`,
          border: `2px solid ${brand.color}`,
          display: 'grid',
          placeItems: 'center',
          color: brand.color,
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width={size * 0.66}
          height={size * 0.66}
          fill="currentColor"
          role="img"
          aria-label="logo"
          // Static, hand-written markup from the list above.
          dangerouslySetInnerHTML={{ __html: brand.icon }}
        />
      </div>
      {showName && <strong className="small">{brand.name}</strong>}
    </div>
  );
}
