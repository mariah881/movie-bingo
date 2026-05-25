import { useEffect } from "react";

type Props = {
  playerName: string;
  phraseText: string;
  onDismiss: () => void;
  autoHideMs?: number;
};

export function BingoOverlay({
  playerName,
  phraseText,
  onDismiss,
  autoHideMs = 5000,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [onDismiss, autoHideMs, playerName, phraseText]);

  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => void ctx.close();
    } catch {
      /* audio optional */
    }
  }, [playerName, phraseText]);

  return (
    <div className="bingo-overlay" role="alert" onClick={onDismiss}>
      <div className="bingo-overlay__card" onClick={(e) => e.stopPropagation()}>
        <p className="bingo-overlay__label">BINGO FOR</p>
        <h1 className="bingo-overlay__name">{playerName}</h1>
        <p className="bingo-overlay__phrase">"{phraseText}"</p>
        <button type="button" className="bingo-overlay__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
