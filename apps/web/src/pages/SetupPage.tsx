import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Player } from "../types";
import {
  createPhrase,
  createPlayer,
  exportPlayersJson,
  importPlayersJson,
  savePlayers,
} from "../lib/storage";

type Props = {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
};

export function SetupPage({ players, onPlayersChange }: Props) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [phraseInputs, setPhraseInputs] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (next: Player[]) => {
    onPlayersChange(next);
    savePlayers(next);
  };

  const addPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    persist([...players, createPlayer(name)]);
    setNewPlayerName("");
  };

  const removePlayer = (id: string) => {
    persist(players.filter((p) => p.id !== id));
  };

  const updatePlayerName = (id: string, name: string) => {
    persist(players.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const addPhrase = (playerId: string) => {
    const text = (phraseInputs[playerId] ?? "").trim();
    if (!text) return;
    persist(
      players.map((p) =>
        p.id === playerId
          ? { ...p, phrases: [...p.phrases, createPhrase(text)] }
          : p,
      ),
    );
    setPhraseInputs((prev) => ({ ...prev, [playerId]: "" }));
  };

  const removePhrase = (playerId: string, phraseId: string) => {
    persist(
      players.map((p) =>
        p.id === playerId
          ? { ...p, phrases: p.phrases.filter((ph) => ph.id !== phraseId) }
          : p,
      ),
    );
  };

  const handleExport = () => {
    const blob = new Blob([exportPlayersJson(players)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movie-bingo-players.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importPlayersJson(String(reader.result));
        persist(imported);
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Players &amp; cards</h1>
        <Link to="/" className="btn btn--secondary">
          Back to game
        </Link>
      </header>

      <section className="card">
        <h2>Add player</h2>
        <div className="row">
          <input
            type="text"
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          />
          <button type="button" className="btn" onClick={addPlayer}>
            Add player
          </button>
        </div>
      </section>

      <section className="card row">
        <button type="button" className="btn btn--secondary" onClick={handleExport}>
          Export JSON
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => fileRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
        {importError && <p className="error">{importError}</p>}
      </section>

      {players.length === 0 && (
        <p className="muted">Add at least one player with phrases before starting a game.</p>
      )}

      {players.map((player) => (
        <section key={player.id} className="card player-card">
          <div className="row player-card__header">
            <input
              className="player-card__name"
              value={player.name}
              onChange={(e) => updatePlayerName(player.id, e.target.value)}
            />
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => removePlayer(player.id)}
            >
              Remove
            </button>
          </div>

          <ul className="phrase-list">
            {player.phrases.map((ph) => (
              <li key={ph.id}>
                <span>{ph.text}</span>
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => removePhrase(player.id, ph.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="row">
            <input
              type="text"
              placeholder="Quote or line from the show"
              value={phraseInputs[player.id] ?? ""}
              onChange={(e) =>
                setPhraseInputs((prev) => ({ ...prev, [player.id]: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && addPhrase(player.id)}
            />
            <button type="button" className="btn" onClick={() => addPhrase(player.id)}>
              Add phrase
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
