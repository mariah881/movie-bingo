# Movie Bingo

Watch-party bingo powered by your **microphone** and **ElevenLabs Scribe** speech-to-text. When dialogue from a movie or series matches a phrase on a player's card, the app shows:

**BINGO FOR [Player Name]**

## Prerequisites

- Node.js 20+
- An [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys) with Speech-to-Text access

## Setup

1. Clone or open this project, then install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and add your API key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `ELEVENLABS_API_KEY`.

3. Start the app (API proxy + web UI):

   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173)

## How to play

1. Go to **Setup players** and add players with quotes/lines you expect in the show.
2. Optionally **Export/Import JSON** to reuse cards across episodes (see `sample-players.json`).
3. On the game screen, choose your **microphone** (point it at the TV/speakers).
4. Click **Start listening** while the show plays.
5. When a phrase is recognized, you'll see **BINGO FOR [name]** and the phrase is checked off on the scoreboard.
6. Use **Reset round** between episodes without losing your card templates.

## Mic tips

- Use a mic close to the TV or speaker, with moderate room volume.
- Reduce background noise (fans, conversations) for fewer false matches.
- Expect **2–8 seconds** of delay with chunked transcription (default 3s chunks).
- Use the volume meter to confirm the mic is picking up audio.
- Toggle **Show transcript** to debug what Scribe hears.

## Import format

```json
[
  {
    "name": "Alice",
    "phrases": ["I'll be back", "Come with me if you want to live"]
  }
]
```

## Architecture

- `apps/web` — Vite + React UI (mic capture, matching, bingo overlay)
- `apps/server` — Express proxy; keeps your ElevenLabs key off the browser

Matching uses substring, token-overlap, and fuzzy strategies with a 90s per-phrase cooldown to limit repeat triggers.

## Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | Run server (3001) + web (5173)       |
| `npm run build`| Build web and server                 |
| `npm start`    | Run production server                |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Server or ElevenLabs API key not ready" | Ensure `.env` exists at project root with a valid key; restart `npm run dev` |
| No transcript text | Check mic permissions; increase TV volume; try a shorter chunk interval |
| False BINGO | Use longer, distinctive phrases (3+ words); reduce room noise |
| API errors | Verify Scribe/STT is enabled on your ElevenLabs plan |
