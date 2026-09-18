export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export function evaluateWord(word: string, guesses: string[], lives = 6) {
  const unique = [
    ...new Set(guesses.map((l) => l.toUpperCase()).filter((l) => LETTERS.includes(l))),
  ];
  const answer = word.toUpperCase();
  const wrong = unique.filter((l) => !answer.includes(l));
  const won = [...answer].every((l) => unique.includes(l));
  return {
    wrong,
    won,
    lost: !won && wrong.length >= lives,
    remaining: Math.max(0, lives - wrong.length),
    score: won ? 100 + Math.max(0, lives - wrong.length) * 50 : 0,
  };
}
