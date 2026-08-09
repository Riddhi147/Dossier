import React, { useState, useEffect } from "react";
import Landing from "./components/Landing.jsx";
import Setup from "./components/Setup.jsx";
import LiveInterview from "./components/LiveInterview.jsx";
import Report from "./components/Report.jsx";
import { getHealth } from "./lib/api.js";
import { SAMPLE_REPORT } from "./lib/sampleReport.js";

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | setup | interview | report | sample
  const [config, setConfig] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [healthWarning, setHealthWarning] = useState(null);

  useEffect(() => {
    getHealth()
      .then((h) => {
        const missing = [];
        if (!h.llmEnabled) missing.push("Groq (question generation & scoring)");
        if (!h.rimeEnabled) missing.push("Rime (falls back to browser voice)");
        if (!h.qdrantEnabled) missing.push("Qdrant (no persistent memory/benchmarking)");
        if (missing.length) {
          setHealthWarning(`Running with some services unconfigured: ${missing.join(", ")}.`);
        }
      })
      .catch(() => {
        setHealthWarning(
          "Couldn't reach the backend. Make sure it's running and VITE_API_BASE points to it."
        );
      });
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "100vh" }}>
      {screen === "landing" && (
        <Landing onStart={() => setScreen("setup")} onSample={() => setScreen("sample")} />
      )}

      {screen === "setup" && (
        <Setup
          onBack={() => setScreen("landing")}
          healthWarning={healthWarning}
          onBegin={async (cfg) => {
            setConfig(cfg);
            setScreen("interview");
          }}
        />
      )}

      {screen === "interview" && config && (
        <LiveInterview
          config={config}
          onFinish={({ sessionId: sid }) => {
            setSessionId(sid);
            setScreen("report");
          }}
          onError={() => {}}
        />
      )}

      {screen === "report" && sessionId && (
        <Report
          sessionId={sessionId}
          onRestart={() => {
            setScreen("landing");
            setConfig(null);
            setSessionId(null);
          }}
        />
      )}

      {screen === "sample" && (
        <Report sampleData={SAMPLE_REPORT} isSample onRestart={() => setScreen("landing")} />
      )}
    </div>
  );
}
