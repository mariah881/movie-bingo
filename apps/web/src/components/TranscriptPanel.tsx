type Props = {
  buffer: string;
  lastSegment: string;
  visible: boolean;
  isTranscribing: boolean;
};

export function TranscriptPanel({
  buffer,
  lastSegment,
  visible,
  isTranscribing,
}: Props) {
  if (!visible) return null;

  return (
    <section className="transcript-panel">
      <h3>Live transcript {isTranscribing && <span className="badge">transcribing…</span>}</h3>
      {lastSegment && (
        <p className="transcript-panel__latest">
          <strong>Latest:</strong> {lastSegment}
        </p>
      )}
      <pre className="transcript-panel__buffer">{buffer || "(waiting for speech…)"}</pre>
    </section>
  );
}
