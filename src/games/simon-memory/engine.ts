export function extend(sequence: number[], random = Math.random) {
  return [...sequence, Math.floor(random() * 4)];
}
export function checkInput(
  sequence: number[],
  input: number[],
  pad: number,
): 'wrong' | 'correct' | 'complete' {
  if (input.length >= sequence.length || sequence[input.length] !== pad) return 'wrong';
  return input.length + 1 === sequence.length ? 'complete' : 'correct';
}
