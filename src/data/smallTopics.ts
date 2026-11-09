/**
 * Topics with real search demand but fewer games than a hub page needs
 * (MIN_COLLECTION_SIZE). Until a topic has enough games for its own hub, its
 * games always link to each other from their "Related games" section.
 */
export const SMALL_TOPICS: { name: string; ids: string[] }[] = [
  { name: 'Cricket', ids: ['cricket-batting', 'cricket-bowling', 'cricket-super-over'] },
  { name: 'Typing', ids: ['typing-tutor', 'typing-challenge', 'speed-typing'] },
  { name: 'Parking', ids: ['parking-challenge', 'parking-puzzle', 'unblock-puzzle'] },
  { name: 'Football', ids: ['penalty-shootout', 'soccer-free-kick'] },
  { name: 'Snake', ids: ['snake', 'neon-serpents'] },
];
