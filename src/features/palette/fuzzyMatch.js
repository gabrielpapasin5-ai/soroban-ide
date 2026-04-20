/**
 * Lightweight subsequence-based fuzzy matcher.
 *
 * Returns a score and the matched character positions (used to highlight
 * the query characters inside the result label).
 *
 * Higher score = better match. Returns score === -1 when `query` does not
 * appear as a subsequence of `text`.
 */

const WORD_BOUNDARY = /[\/_\-. ]/;

export const fuzzyScore = (query, text) => {
  if (!query) return { score: 0, positions: [] };
  if (!text) return { score: -1, positions: [] };

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qi = 0;
  let score = 0;
  let consecutive = 0;
  let lastMatchIdx = -1;
  const positions = [];

  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] !== q[qi]) {
      consecutive = 0;
      continue;
    }

    let bonus = 1;
    if (i === 0) bonus += 4;
    else if (WORD_BOUNDARY.test(t[i - 1])) bonus += 3;

    if (lastMatchIdx === i - 1) {
      consecutive += 1;
      bonus += consecutive * 2;
    } else {
      consecutive = 0;
    }

    score += bonus;
    lastMatchIdx = i;
    positions.push(i);
    qi += 1;
  }

  if (qi < q.length) return { score: -1, positions: [] };

  // Gentle bias toward shorter labels when scores are close.
  score -= t.length * 0.01;

  return { score, positions };
};

/**
 * Render a label as an array of { text, matched } segments based on positions.
 * Consumers use this to highlight matched characters.
 */
export const highlightMatches = (text, positions) => {
  if (!positions?.length) return [{ text, matched: false }];
  const segments = [];
  let cursor = 0;
  const sorted = [...positions].sort((a, b) => a - b);
  for (const pos of sorted) {
    if (pos > cursor) segments.push({ text: text.slice(cursor, pos), matched: false });
    segments.push({ text: text.slice(pos, pos + 1), matched: true });
    cursor = pos + 1;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
};
