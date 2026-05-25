import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BingoOverlay } from "../components/BingoOverlay";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { VolumeMeter } from "../components/VolumeMeter";
import { useMicrophone } from "../hooks/useMicrophone";
import { useTranscription } from "../hooks/useTranscription";
import {
  clearMatchCooldowns,
  findMatches,
  trimTranscriptBuffer,
} from "../lib/matcher";
import { savePlayers } from "../lib/storage";
import type { BingoEvent, Player } from "../types";

type Props = {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
};

export function GamePage({ players, onPlayersChange }: Props) {
  const [listening, setListening] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [showTranscript, setShowTranscript] = useState(true);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [bingo, setBingo] = useState<BingoEvent | null>(null);
  const [chunkMs, setChunkMs] = useState(3000);

  const playersRef = useRef(players);
  playersRef.current = players;
  const bufferRef = useRef("");

  const {
    transcriptBuffer,
    lastSegment,
    isTranscribing,
    error: transcribeError,
    transcribeChunk,
    clearTranscript,
  } = useTranscription();

  const handleChunk = useCallback(
    async (blob: Blob) => {
      const text = await transcribeChunk(blob);
      if (!text) return;

      bufferRef.current = trimTranscriptBuffer(
        bufferRef.current ? `${bufferRef.current} ${text}` : text,
      );
      const matches = findMatches(playersRef.current, bufferRef.current, text);

      if (matches.length === 0) return;

      const match = matches[0];
      const now = new Date().toISOString();

      const updated = playersRef.current.map((p) =>
        p.id === match.playerId
          ? {
              ...p,
              phrases: p.phrases.map((ph) =>
                ph.id === match.phraseId
                  ? { ...ph, matched: true, matchedAt: now }
                  : ph,
              ),
            }
          : p,
      );

      onPlayersChange(updated);
      savePlayers(updated);

      setBingo({
        playerId: match.playerId,
        playerName: match.playerName,
        phraseId: match.phraseId,
        phraseText: match.phraseText,
        at: now,
      });
    },
    [transcribeChunk, onPlayersChange],
  );

  const { devices, volume, error: micError, active } = useMicrophone({
    deviceId: deviceId || undefined,
    chunkMs,
    onChunk: handleChunk,
    enabled: listening,
  });

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { ok?: boolean; elevenLabsConfigured?: boolean }) => {
        setServerOk(Boolean(d.ok && d.elevenLabsConfigured));
      })
      .catch(() => setServerOk(false));
  }, []);

  const resetRound = () => {
    const reset = players.map((p) => ({
      ...p,
      phrases: p.phrases.map((ph) => ({
        ...ph,
        matched: false,
        matchedAt: undefined,
      })),
    }));
    onPlayersChange(reset);
    savePlayers(reset);
    bufferRef.current = "";
    clearTranscript();
    clearMatchCooldowns();
    setBingo(null);
  };

  const canStart = players.length > 0 && players.some((p) => p.phrases.length > 0);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Movie Bingo</h1>
        <Link to="/setup" className="btn btn--secondary">
          Setup players
        </Link>
      </header>

      {serverOk === false && (
        <div className="banner banner--error">
          Server or ElevenLabs API key not ready. Copy <code>.env.example</code> to{" "}
          <code>.env</code> in the project root and set <code>ELEVENLABS_API_KEY</code>, then run{" "}
          <code>npm run dev</code>.
        </div>
      )}

      {serverOk === true && (
        <div className="banner banner--ok">ElevenLabs connected</div>
      )}

      <section className="card controls">
        <label>
          Microphone
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            disabled={listening}
          >
            <option value="">Default</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </label>

        <label>
          Chunk interval (seconds)
          <select
            value={chunkMs}
            onChange={(e) => setChunkMs(Number(e.target.value))}
            disabled={listening}
          >
            <option value={2000}>2</option>
            <option value={3000}>3</option>
            <option value={4000}>4</option>
          </select>
        </label>

        <VolumeMeter volume={volume} active={active} />

        <div className="row">
          {!listening ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canStart || serverOk === false}
              onClick={() => setListening(true)}
            >
              Start listening
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => setListening(false)}
            >
              Stop listening
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={resetRound}>
            Reset round
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showTranscript}
              onChange={(e) => setShowTranscript(e.target.checked)}
            />
            Show transcript
          </label>
        </div>

        {(micError || transcribeError) && (
          <p className="error">{micError || transcribeError}</p>
        )}

        {!canStart && (
          <p className="muted">
            Add players and phrases in <Link to="/setup">Setup</Link> before starting.
          </p>
        )}
      </section>

      <TranscriptPanel
        buffer={transcriptBuffer}
        lastSegment={lastSegment}
        visible={showTranscript}
        isTranscribing={isTranscribing}
      />

      <section className="card">
        <h2>Scoreboard</h2>
        {players.map((player) => (
          <div key={player.id} className="scoreboard-player">
            <h3>
              {player.name}{" "}
              <span className="muted">
                ({player.phrases.filter((p) => p.matched).length}/{player.phrases.length})
              </span>
            </h3>
            <ul className="phrase-list phrase-list--score">
              {player.phrases.map((ph) => (
                <li key={ph.id} className={ph.matched ? "matched" : ""}>
                  {ph.matched ? "✓ " : "○ "}
                  {ph.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {bingo && (
        <BingoOverlay
          playerName={bingo.playerName}
          phraseText={bingo.phraseText}
          onDismiss={() => setBingo(null)}
        />
      )}
    </div>
  );
}
