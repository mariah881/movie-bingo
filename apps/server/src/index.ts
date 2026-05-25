import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(rootDir, ".env") });
import cors from "cors";
import express from "express";
import { transcribeRouter } from "./routes/transcribe.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
  });
});

app.use("/api", transcribeRouter);

app.listen(PORT, () => {
  console.log(`Movie Bingo server listening on http://localhost:${PORT}`);
});
