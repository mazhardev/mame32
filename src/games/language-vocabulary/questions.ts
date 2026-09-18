import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Word = [english: string, spanish: string, french: string, german: string, level: 1 | 2 | 3];

export const WORDS: Word[] = [
  ['cat', 'gato', 'chat', 'Katze', 1],
  ['dog', 'perro', 'chien', 'Hund', 1],
  ['house', 'casa', 'maison', 'Haus', 1],
  ['water', 'agua', 'eau', 'Wasser', 1],
  ['bread', 'pan', 'pain', 'Brot', 1],
  ['book', 'libro', 'livre', 'Buch', 1],
  ['apple', 'manzana', 'pomme', 'Apfel', 1],
  ['red', 'rojo', 'rouge', 'rot', 1],
  ['blue', 'azul', 'bleu', 'blau', 1],
  ['green', 'verde', 'vert', 'grün', 1],
  ['sun', 'sol', 'soleil', 'Sonne', 1],
  ['moon', 'luna', 'lune', 'Mond', 1],
  ['friend', 'amigo', 'ami', 'Freund', 1],
  ['hello', 'hola', 'bonjour', 'hallo', 1],
  ['thank you', 'gracias', 'merci', 'danke', 1],
  ['good', 'bueno', 'bon', 'gut', 1],
  ['big', 'grande', 'grand', 'groß', 1],
  ['small', 'pequeño', 'petit', 'klein', 1],
  ['milk', 'leche', 'lait', 'Milch', 2],
  ['cheese', 'queso', 'fromage', 'Käse', 2],
  ['school', 'escuela', 'école', 'Schule', 2],
  ['window', 'ventana', 'fenêtre', 'Fenster', 2],
  ['door', 'puerta', 'porte', 'Tür', 2],
  ['car', 'coche', 'voiture', 'Auto', 2],
  ['city', 'ciudad', 'ville', 'Stadt', 2],
  ['tree', 'árbol', 'arbre', 'Baum', 2],
  ['flower', 'flor', 'fleur', 'Blume', 2],
  ['bird', 'pájaro', 'oiseau', 'Vogel', 2],
  ['fish', 'pez', 'poisson', 'Fisch', 2],
  ['horse', 'caballo', 'cheval', 'Pferd', 2],
  ['beach', 'playa', 'plage', 'Strand', 2],
  ['mountain', 'montaña', 'montagne', 'Berg', 2],
  ['river', 'río', 'rivière', 'Fluss', 2],
  ['kitchen', 'cocina', 'cuisine', 'Küche', 2],
  ['morning', 'mañana', 'matin', 'Morgen', 2],
  ['night', 'noche', 'nuit', 'Nacht', 2],
  ['to eat', 'comer', 'manger', 'essen', 2],
  ['to drink', 'beber', 'boire', 'trinken', 2],
  ['to sleep', 'dormir', 'dormir', 'schlafen', 2],
  ['to speak', 'hablar', 'parler', 'sprechen', 2],
  ['butterfly', 'mariposa', 'papillon', 'Schmetterling', 3],
  ['library', 'biblioteca', 'bibliothèque', 'Bibliothek', 3],
  ['strawberry', 'fresa', 'fraise', 'Erdbeere', 3],
  ['cloud', 'nube', 'nuage', 'Wolke', 3],
  ['key', 'llave', 'clé', 'Schlüssel', 3],
  ['knife', 'cuchillo', 'couteau', 'Messer', 3],
  ['bridge', 'puente', 'pont', 'Brücke', 3],
  ['weather', 'tiempo', 'météo', 'Wetter', 3],
  ['to run', 'correr', 'courir', 'laufen', 3],
  ['to write', 'escribir', 'écrire', 'schreiben', 3],
  ['to learn', 'aprender', 'apprendre', 'lernen', 3],
  ['yesterday', 'ayer', 'hier', 'gestern', 3],
  ['tomorrow', 'mañana', 'demain', 'morgen', 3],
  ['always', 'siempre', 'toujours', 'immer', 3],
];

const LANGS = [
  { name: 'Spanish', col: 1 },
  { name: 'French', col: 2 },
  { name: 'German', col: 3 },
] as const;

/**
 * Mostly foreign → English. Harder rounds add English → foreign, which is
 * harder to recall. Spanish "mañana" means both morning and tomorrow, and
 * German only capitalises the noun (Morgen/morgen), so those two are never
 * offered as each other's distractors.
 */
export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const items: BankItem[] = [];
  const ambiguous = new Set(['morning', 'tomorrow']);
  for (const word of WORDS) {
    const [english, , , , level] = word;
    for (const { name, col } of LANGS) {
      const foreign = word[col] as string;
      const pool = WORDS.filter(
        (w) =>
          w[0] !== english &&
          w[col] !== foreign &&
          !(ambiguous.has(english) && ambiguous.has(w[0])),
      );
      const wrongEnglish = rng
        .shuffle(pool)
        .slice(0, 3)
        .map((w) => w[0]);
      items.push({
        prompt: `What does the ${name} word “${foreign}” mean?`,
        correct: english,
        wrong: wrongEnglish,
        level,
      });
      if (d !== 'easy') {
        const wrongForeign = rng
          .shuffle(pool)
          .slice(0, 3)
          .map((w) => w[col] as string);
        items.push({
          prompt: `How do you say “${english}” in ${name}?`,
          correct: foreign,
          wrong: wrongForeign,
          level: Math.min(3, level + 1) as 1 | 2 | 3,
        });
      }
    }
  }
  return drawFromBank(items, rng, d, 10);
}
