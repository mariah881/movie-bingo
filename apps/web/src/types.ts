export type Phrase = {
  id: string;
  text: string;
  matched: boolean;
  matchedAt?: string;
};

export type Player = {
  id: string;
  name: string;
  phrases: Phrase[];
};

export type GameState = {
  players: Player[];
  transcriptBuffer: string;
};

export type MatchResult = {
  playerId: string;
  playerName: string;
  phraseId: string;
  phraseText: string;
  score: number;
  method: "substring" | "token" | "fuzzy";
};

export type BingoEvent = {
  playerId: string;
  playerName: string;
  phraseId: string;
  phraseText: string;
  at: string;
};
