import { useCallback, useEffect, useRef, useState } from "react";

export type UseMicrophoneOptions = {
  deviceId?: string;
  chunkMs?: number;
  onChunk: (blob: Blob) => void;
  enabled: boolean;
};

export function useMicrophone({
  deviceId,
  chunkMs = 3000,
  onChunk,
  enabled,
}: UseMicrophoneOptions) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "audioinput"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not list microphones");
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
    };
  }, [refreshDevices]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setActive(false);
    setVolume(0);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(Math.min(100, Math.round((avg / 128) * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          onChunkRef.current(ev.data);
        }
      };

      recorder.onerror = () => {
        setError("MediaRecorder error");
      };

      recorder.start(chunkMs);
      setActive(true);
      await refreshDevices();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Microphone access denied or unavailable",
      );
      stop();
    }
  }, [deviceId, chunkMs, stop, refreshDevices]);

  useEffect(() => {
    if (enabled) {
      void start();
    } else {
      stop();
    }
    return () => stop();
  }, [enabled, start, stop]);

  return {
    devices,
    volume,
    error,
    active,
    refreshDevices,
    stop,
    start,
  };
}
