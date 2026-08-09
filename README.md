# Dossier — AI Interview & Learning Coach

A voice-first, adaptive AI interviewer: pick a role and seniority, get a
15-minute clock-paced interview that adapts its next question to how well
you just answered, then get a structured performance report — not a text
blob. Flow is modeled on ApertureAI's interview experience; scoring model
follows the original TDR (correctness / depth / relevance / communication).

```
frontend/   React + Vite SPA — landing, setup, live interview, report
backend/    Node + Express API — Claude for questions/eval/reports,
            Rime for voice, Qdrant for memory/retrieval/benchmarking
docker-compose.yml   local Qdrant for dev (optional — Qdrant Cloud works too)
```

## How the three required pieces are used

| Service | Where | What it does |
|---|---|---|
| **Claude** (LLM) | `backend/src/lib/llm.js` | Generates each question, evaluates every answer on 4 dimensions, decides the next question's difficulty/depth, writes the closing report. |
| **Rime** | `backend/src/lib/rime.js`, exposed via `POST /api/tts` | Turns interviewer questions into speech server-side (API key never touches the browser). |
| **Qdrant** | `backend/src/lib/qdrant.js` | Stores every evaluated answer as a vector point (real conversation memory), retrieves similar past answers, and computes peer benchmarks per role/seniority for the report. |

If any of the three API keys is missing, the backend runs in **demo mode**
for that piece (static question bank instead of Claude, browser TTS instead
of Rime, no persistence/benchmarking instead of Qdrant) so you can develop
the UI incrementally — but a real submission/deployment should have all
three configured.

---

## 1. Run it locally

### Backend

```bash
cd backend
cp .env.example .env     # fill in ANTHROPIC_API_KEY, RIME_API_KEY, QDRANT_URL/QDRANT_API_KEY
npm install
npm run dev               # http://localhost:8787
```

Don't have a Qdrant Cloud cluster yet? Run one locally instead:

```bash
docker compose up -d      # from the repo root
# then in backend/.env:
#   QDRANT_URL=http://localhost:6333
#   QDRANT_API_KEY=        (leave blank)
```

### Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE=http://localhost:8787
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173`, click **Start Practice**, and go through a
session. Chrome is recommended — the browser mic input (`SpeechRecognition`)
is Chrome-only; other browsers fall back to text mode automatically.

---

## 2. Get your API keys

- **Anthropic (Claude):** console.anthropic.com → API Keys
- **Rime:** app.rime.ai/signup → API Tokens page
- **Qdrant:** cloud.qdrant.io → create a free cluster → copy its URL and API key

---

## 3. Deploy

### Backend → Render / Railway / Fly.io (any Node host works)

1. Push this repo to GitHub.
2. Create a new **Web Service** pointed at the `backend/` directory
   (or use the included `backend/Dockerfile`).
3. Build command: `npm install` · Start command: `npm start`
4. Set environment variables (same names as `backend/.env.example`):
   `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `RIME_API_KEY`, `RIME_SPEAKER`,
   `RIME_MODEL`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`,
   `CORS_ORIGIN` (set this to your deployed frontend's URL once you have it).
5. Note the deployed backend URL, e.g. `https://dossier-api.onrender.com`.

### Frontend → Vercel / Netlify

1. Import the same repo, set the project root to `frontend/`.
2. Build command: `npm run build` · Output directory: `dist`
3. Set environment variable `VITE_API_BASE` to your deployed backend URL
   from the step above.
4. Deploy. Then go back to the backend's `CORS_ORIGIN` env var and set it
   to this frontend's deployed URL, and redeploy the backend.

That's it — no database to provision beyond Qdrant Cloud, which is already
your vector store.

---

## 4. Project structure

```
backend/
  src/
    server.js            Express app, health check, route mounting
    routes/
      session.js          POST /api/sessions            start a session
                            POST /api/sessions/:id/answer  submit + adapt
                            GET  /api/sessions/:id/report  structured report
      tts.js               POST /api/tts                  Rime proxy
    lib/
      llm.js               Claude: questions, evaluation, adaptation, reports
      rime.js              Rime TTS client
      qdrant.js             Qdrant memory / retrieval / benchmarking
      embed.js              local text embedding (swap point — see file)
    data/
      questionBank.js       static fallback content for demo mode

frontend/
  src/
    App.jsx                screen router
    components/
      Landing.jsx, Setup.jsx, LiveInterview.jsx, Report.jsx, common.jsx
    lib/
      api.js                backend client
      speech.js             Rime-via-backend TTS + browser STT wrapper
      sampleReport.js        static data for "View Sample Report"
    theme.js                design tokens
```

## 5. Known swap points for a production version

These are called out in code comments too:

- **`backend/src/lib/embed.js`** — currently a dependency-free hashing
  embedding so Qdrant works with zero extra credentials. Swap for a real
  embedding model (Voyage AI, OpenAI `text-embedding-3-small`, or Qdrant
  Cloud's built-in inference) for materially better semantic retrieval.
- **`frontend/src/lib/speech.js`** — STT uses the browser's
  `SpeechRecognition` API (Chrome-only, no extra credentials needed). Swap
  for a hosted streaming STT provider (Deepgram, AssemblyAI, Rime's own STT
  if/when available) for cross-browser support and lower latency.
- **Session storage** — `backend/src/routes/session.js` keeps sessions in
  an in-process `Map`. Fine for a single instance / demo; swap for
  Redis or Postgres before running multiple backend instances behind a
  load balancer.
