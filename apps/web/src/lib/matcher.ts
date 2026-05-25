import type { MatchResult, Player } from "../types";

const COOLDOWN_MS = 90_000;
const TRANSCRIPT_WINDOW_CHARS = 2000;
const MIN_PHRASE_WORDS = 2;
const TOKEN_THRESHOLD = 0.8;
const FUZZY_THRESHOLD = 0.85;

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "is", "it",
]);

const recentMatches = new Map<string, number>();

export function clearMatchCooldowns(): void {
  recentMatches.clear();
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarityRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function tokenOverlapScore(phrase: string, haystack: string): number {
  const words = significantWords(phrase);
  if (words.length === 0) return 0;
  const normalizedHay = normalize(haystack);
  let found = 0;
  let searchFrom = 0;
  for (const word of words) {
    const idx = normalizedHay.indexOf(word, searchFrom);
    if (idx === -1) return 0;
    found++;
    searchFrom = idx + word.length;
  }
  return found / words.length;
}

function isOnCooldown(phraseId: string): boolean {
  const last = recentMatches.get(phraseId);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

function recordMatch(phraseId: string): void {
  recentMatches.set(phraseId, Date.now());
}

export function trimTranscriptBuffer(buffer: string): string {
  if (buffer.length <= TRANSCRIPT_WINDOW_CHARS) return buffer;
  return buffer.slice(-TRANSCRIPT_WINDOW_CHARS);
}

export function findMatches(
  players: Player[],
  transcriptWindow: string,
  newSegment: string,
): MatchResult[] {
  const haystack = normalize(transcriptWindow);
  const segmentNorm = normalize(newSegment);
  if (!haystack && !segmentNorm) return [];

  const combined = `${haystack} ${segmentNorm}`.trim();
  const results: MatchResult[] = [];

  for (const player of players) {
    for (const phrase of player.phrases) {
      if (phrase.matched || isOnCooldown(phrase.id)) continue;

      const phraseNorm = normalize(phrase.text);
      if (!phraseNorm) continue;

      const wordCount = phraseNorm.split(" ").filter(Boolean).length;
      if (wordCount < MIN_PHRASE_WORDS && phraseNorm.length < 6) continue;

      let match: MatchResult | null = null;

      if (combined.includes(phraseNorm)) {
        match = {
          playerId: player.id,
          playerName: player.name,
          phraseId: phrase.id,
          phraseText: phrase.text,
          score: 1,
          method: "substring",
        };
      } else {
        const tokenScore = tokenOverlapScore(phrase.text, combined);
        if (tokenScore >= TOKEN_THRESHOLD) {
          match = {
            playerId: player.id,
            playerName: player.name,
            phraseId: phrase.id,
            phraseText: phrase.text,
            score: tokenScore,
            method: "token",
          };
        } else {
          const fuzzyScore = similarityRatio(phraseNorm, segmentNorm);
          if (fuzzyScore >= FUZZY_THRESHOLD && segmentNorm.length >= phraseNorm.length * 0.5) {
            match = {
              playerId: player.id,
              playerName: player.name,
              phraseId: phrase.id,
              phraseText: phrase.text,
              score: fuzzyScore,
              method: "fuzzy",
            };
          }
        }
      }

      if (match) {
        recordMatch(phrase.id);
        results.push(match);
      }
    }
  }

  return results;
}
