import "dotenv/config";
import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/session.js";
import ttsRoutes from "./routes/tts.js";
import { llmEnabled } from "./lib/llm.js";
import { rimeEnabled } from "./lib/rime.js";
import { qdrantEnabled } from "./lib/qdrant.js";

{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "frontend/dist" }
    },
    {
      "src": "backend/src/server.js",
      "use": "@vercel/node"
    }
  ],
    "routes": [
      {
        "src": "/api/(.*)",
        "dest": "/backend/src/server.js"
      },
      {
        "handle": "filesystem"
      },
      {
        "src": "/(.*)",
        "dest": "/frontend/dist/$1"
      }
    ],
      "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}

const app = express();
const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    llmEnabled,
    rimeEnabled,
    qdrantEnabled,
    demoMode: !llmEnabled,
  });
});

app.use("/api/sessions", sessionRoutes);
app.use("/api/tts", ttsRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

if (process.env.VERCEL) {
  // Export as Vercel serverless function
  export default (req, res) => app(req, res);
} else {
  app.listen(PORT, () => {
    console.log(`AI Interview Coach backend listening on :${PORT}`);
    console.log(
      `  LLM (Groq): ${llmEnabled ? "enabled" : "DISABLED — demo mode"}\n` +
      `  Rime (voice): ${rimeEnabled ? "enabled" : "DISABLED — browser TTS fallback"}\n` +
      `  Qdrant (memory): ${qdrantEnabled ? "enabled" : "DISABLED — no persistence/benchmarking"}`
    );
  });
}
