import { useCallback, useState } from "react";

type Props = {
  deviceId?: string;
  disabled?: boolean;
};

export function MicTest({ deviceId, disabled }: Props) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    setError(null);
    setResult(null);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = () => reject(new Error("Recording failed"));
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 3000);
      });

      const form = new FormData();
      form.append("audio", blob, "test.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || `Test failed (${res.status})`);
      }

      setResult(data.text?.trim() || "(no speech detected)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mic test failed");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setTesting(false);
    }
  }, [deviceId]);

  return (
    <div className="mic-test">
      <button
        type="button"
        className="btn btn--secondary"
        disabled={disabled || testing}
        onClick={() => void runTest()}
      >
        {testing ? "Recording 3s…" : "Test mic (3s)"}
      </button>
      {result && (
        <p className="mic-test__result">
          <strong>Heard:</strong> {result}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
