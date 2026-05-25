import { Router } from "express";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const transcribeRouter = Router();

transcribeRouter.post("/transcribe", upload.single("audio"), async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured on the server" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Missing audio file (field name: audio)" });
    return;
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(req.file.buffer)], {
      type: req.file.mimetype || "audio/webm",
    });
    formData.append("file", blob, req.file.originalname || "audio.webm");
    formData.append("model_id", "scribe_v1");
    formData.append("tag_audio_events", "false");
    formData.append("diarize", "false");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
    });

    const body = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      res.status(response.status).json({
        error: (body.detail as string) || (body.message as string) || "ElevenLabs transcription failed",
        details: body,
      });
      return;
    }

    const text =
      (body.text as string) ||
      (body.transcript as string) ||
      extractWordsText(body.words);

    res.json({
      text: text?.trim() ?? "",
      words: body.words,
      language: body.language_code ?? body.language,
    });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Transcription request failed",
    });
  }
});

function extractWordsText(words: unknown): string {
  if (!Array.isArray(words)) return "";
  return words
    .map((w) => {
      if (typeof w === "string") return w;
      if (w && typeof w === "object" && "text" in w) {
        return String((w as { text: string }).text);
      }
      return "";
    })
    .join(" ")
    .trim();
}
