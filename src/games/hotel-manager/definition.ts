import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hotel-manager',
  title: 'Hotel Manager',
  category: 'strategy',
  difficulty: 'medium',
  icon: '🏨',
  tags: ['hotel', 'bookings', 'calendar', 'management', 'economy', 'save'],
  short: 'Juggle bookings on the room calendar, keep rooms clean and grow a five-star hotel.',
  full: 'Run a small hotel for a month. Booking requests arrive every morning — a business traveller for one night, a family for five, a honeymoon couple who want the suite — and you fit them onto the room calendar. Take the cheap long stay now, or hold the room for a better offer? Every check-out leaves a room to clean, and guests who walk into a messy room leave terrible reviews. Good reviews bring more guests and better offers. Build new rooms, renovate to deluxe and suites, open a café, pool or spa, and hit the month’s profit goal.',
  minutes: 15,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a request and press Enter, then Tab to a room and press Enter'],
    mouse: ['Click a request, then click a room row on the calendar'],
    touch: ['Tap a request, then tap a room row on the calendar'],
  },
  instructions: {
    objective: 'Have the goal amount of cash after night 30.',
    howToPlay: [
      'Tap a booking request; the calendar shows where it fits (green) and clashes (red).',
      'Tap a room row to accept the booking into that room. Guests happily take a better room than they asked for.',
      'Requests for future nights wait for you; decline the ones you do not want.',
      'Each housekeeper cleans three rooms a day, rooms with guests arriving first.',
      'Press “End the day” to collect the night’s money and pay wages and upkeep.',
    ],
    scoring:
      'Your score is your cash at the end of the month. Reviews: 3.5★ for the room they asked for, more for an upgrade, 1.5★ for a dirty room.',
    difficultyNotes:
      'Easy: 600 starting coins, steady demand, cheap staff, goal 4,400. Normal: 400 coins, goal 4,700. Hard: 300 coins, wilder offers, pricier staff, goal 4,800.',
    tips: [
      'An empty room earns nothing — but a cheap guest can block a great offer.',
      'Watch the 🧹 badges and the warning about dirty rooms with arrivals tonight.',
      'Don’t keep housekeepers you don’t need; their wages add up.',
      'Weekends bring more requests.',
    ],
    touchNotes: [
      'The calendar scrolls sideways on very small screens; every room row is a large tap target.',
    ],
  },
  achievements: [
    ['first', 'Checked In', 'Accept your first booking.', 1, '🛎️', 5],
    ['full', 'No Vacancy', 'Have every room occupied for a night.', 1, '🈵', 20],
    ['suite', 'Suite Dreams', 'Host a guest who booked a suite in a suite.', 1, '👑', 15],
    ['stars', 'Rave Reviews', 'Reach a 4.5★ rating.', 1, '⭐', 25],
    ['rooms', 'Grand Hotel', 'Own 10 rooms.', 10, '🏨', 20],
    ['goal', 'Hotelier', 'Reach the month’s goal.', 1, '🏅', 30],
    ['hard', 'Five-Star Manager', 'Reach the goal on Hard.', 1, '🏆', 40],
    ['guests', 'Guest Book', 'Welcome 300 guests in total.', 300, '📖', 25],
  ],
  load: () => import('./HotelGame'),
});
