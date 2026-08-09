# Dossier — AI Interview & Learning Coach

## 🎯 Overview
The **AI Interview Coach** is a modern, voice‑first web application that lets anyone conduct a realistic, timed interview with an AI interviewer. It generates context‑aware questions, evaluates answers on correctness, depth, relevance and communication, and produces a structured performance report.

- **Frontend** – React + Vite SPA, premium UI with glass‑morphism, gradients, and micro‑animations.
- **Backend** – Node 18 + Express API exposing health, session, and text‑to‑speech endpoints.
- **AI services** – Groq for question generation/evaluation, Rime for server‑side TTS, and Qdrant vector store for memory/benchmarking.
- **Deployment** – Zero‑config serverless deployment on Vercel (static files from `frontend/dist` and API routes served as serverless functions).

---

## 🏗️ Architecture
```
+-------------------+        +----------------------+
|  Frontend (React) |  <--►  |  Backend (Express)   |
|  – Vite build     | HTTP   |  – /api/health       |
|  – UI + Speech    |        |  – /api/sessions     |
+-------------------+        |  – LLM calls         |
            |                +----------------------+
            ▼                     ▲
   Vercel Edge Platform           │
   – Serves static files from    │
     frontend/dist               │
   – Routes /api/* to the       │
     serverless function        │
   – Handles scaling & CDN      │
```

## 📂 Repository Structure
```
interview-coach/
├─ backend/               # Express API
│   └─ src/
│       ├─ server.js
│       ├─ routes/
│       └─ lib/ (llm, rime, qdrant)
├─ frontend/              # React SPA
│   └─ src/
│       ├─ App.jsx
│       ├─ components/
│       └─ lib/ (api, speech)
├─ docker-compose.yml     # Optional Qdrant container for local dev
├─ vercel.json            # Vercel routing & output directory
└─ README.md              # <-- this file
```

---

## ⚙️ Getting Started (Local Development)
### Prerequisites
- Node ≥ 18
- Docker (optional, for Qdrant)
- Chrome (for SpeechRecognition)

### 1️⃣ Backend
```bash
cd backend
cp .env.example .env   # Fill in your API keys
npm install
npm run dev            # Starts at http://localhost:8787
```
If you don’t have a Qdrant cloud instance, run a local one:
```bash
docker compose up -d   # from repository root
# Then set in .env:
# QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=   (leave empty for local instance)
```
### 2️⃣ Frontend
```bash
cd ../frontend
cp .env.example .env   # Set VITE_API_BASE=http://localhost:8787
npm install
npm run dev            # Starts at http://localhost:5173
```
Open the URL, click **Start Practice**, and enjoy a full interview flow. Chrome is recommended for microphone support.

---

## 🚀 Production Deployment (Vercel)
1. **Push to GitHub** – the repo is already linked to Vercel.
2. **Vercel Settings** – set **Root Directory** to `.` (project root). Vercel automatically detects the `frontend` workspace.
3. **Environment Variables** – add the following in the Vercel dashboard:
   - `GROQ_API_KEY` (or `ANTHROPIC_API_KEY` depending on the LLM you use)
   - `RIME_API_KEY`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - `CORS_ORIGIN` – the URL of your deployed frontend (e.g., `https://your-app.vercel.app`).
4. **vercel.json** – the file already contains the minimal configuration:
```json
{
  "outputDirectory": "frontend/dist",
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/src/server.js" },
    { "handle": "filesystem" }
  ]
}
```
   *No `builds` array is needed – Vercel will run `npm install && vite build` for the frontend automatically.*
5. **Deploy** – Vercel will build the frontend, expose the API as a serverless function, and provide a preview URL. Test the health endpoint:
```bash
curl https://<your‑app>.vercel.app/api/health
```
   You should receive `{ "ok": true, ... }`.

---

## 🔑 Environment Variables
| Variable | Scope | Description |
|----------|-------|-------------|
| `GROQ_API_KEY` | Backend | LLM API key (Claude/Groq). |
| `RIME_API_KEY` | Backend | Text‑to‑speech service token. |
| `QDRANT_URL` | Backend | URL of Qdrant vector store (cloud or `http://localhost:6333`). |
| `QDRANT_API_KEY` | Backend | Qdrant auth token (optional for local). |
| `CORS_ORIGIN` | Backend | Frontend origin allowed for CORS. |
| `VITE_API_BASE` | Frontend | Base URL of the backend API (e.g., https://api.vercel.app). |

---

## 📚 Usage
1. **Select role & seniority** on the landing page.
2. **Start interview** – you have a 15‑minute timer, the AI adapts questions based on your performance.
3. **Receive a report** – after the session you get a structured PDF‑style report with scores and actionable feedback.

---

## 🤝 Contributing
Contributions are welcome! Please:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).
3. Ensure the app runs locally and all tests pass (`npm test` if you add tests).
4. Open a Pull Request describing the change.

### Code Style
- Use **Prettier** for formatting (`npm run format`).
- Follow the existing folder conventions.
- Keep UI components small and reusable.

---

## 📜 License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Built with love by the Riddhi147 team.*
