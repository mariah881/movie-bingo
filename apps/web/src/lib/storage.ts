import type { Player } from "../types";

const PLAYERS_KEY = "movie-bingo:players";

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Player[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlayers(players: Player[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function createPlayer(name: string): Player {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    phrases: [],
  };
}

export function createPhrase(text: string): import("../types").Phrase {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    matched: false,
  };
}

export function exportPlayersJson(players: Player[]): string {
  return JSON.stringify(
    players.map((p) => ({
      name: p.name,
      phrases: p.phrases.map((ph) => ph.text),
    })),
    null,
    2,
  );
}

export function importPlayersJson(json: string): Player[] {
  const data = JSON.parse(json) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("JSON must be an array of players");
  }
  return data.map((entry, i) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid player at index ${i}`);
    }
    const obj = entry as { name?: string; phrases?: string[] };
    const name = typeof obj.name === "string" ? obj.name : `Player ${i + 1}`;
    const phrases = Array.isArray(obj.phrases)
      ? obj.phrases.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [];
    return {
      id: crypto.randomUUID(),
      name,
      phrases: phrases.map((text) => createPhrase(text)),
    };
  });
}
