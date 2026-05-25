import { useCallback, useRef, useState } from "react";

export function useTranscription() {
  const [transcriptBuffer, setTranscriptBuffer] = useState("");
  const [lastSegment, setLastSegment] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const transcribeChunk = useCallback(async (blob: Blob): Promise<string> => {
    if (blob.size < 1000) return "";

    const run = async (): Promise<string> => {
      setIsTranscribing(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("audio", blob, "chunk.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });

        const data = (await res.json()) as { text?: string; error?: string };

        if (!res.ok) {
          throw new Error(data.error || `Transcription failed (${res.status})`);
        }

        const text = (data.text ?? "").trim();
        if (!text) return "";

        setLastSegment(text);
        setTranscriptBuffer((prev) => {
          const next = prev ? `${prev} ${text}` : text;
          return next.length > 4000 ? next.slice(-4000) : next;
        });

        return text;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transcription failed");
        return "";
      } finally {
        setIsTranscribing(false);
      }
    };

    const resultPromise = queueRef.current.then(run);
    queueRef.current = resultPromise.catch(() => "");
    return resultPromise;
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscriptBuffer("");
    setLastSegment("");
    setError(null);
  }, []);

  return {
    transcriptBuffer,
    lastSegment,
    isTranscribing,
    error,
    transcribeChunk,
    clearTranscript,
    setTranscriptBuffer,
  };
}
