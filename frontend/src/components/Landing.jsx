import React from "react";
import { Play, FileText } from "lucide-react";
import { T } from "../theme.js";
import { Logo } from "./common.jsx";

export default function Landing({ onStart, onSample }) {
  return (
    <div
      style={{
        minHeight: "100%",
        background: T.bg,
        color: T.paper,
        fontFamily: T.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${T.stoneLine}`,
        }}
      >
        <Logo />
        <span
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.stone,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Adaptive Interview Coach
        </span>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 32px",
        }}
      >
        <div style={{ maxWidth: 720, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              border: `1px solid ${T.stoneLine}`,
              borderRadius: 100,
              fontFamily: T.mono,
              fontSize: 11,
              color: T.sageBright,
              letterSpacing: 1,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.sageBright,
                display: "inline-block",
              }}
            />
            15-MINUTE · VOICE-FIRST · ADAPTIVE
          </div>

          <h1
            style={{
              fontFamily: T.serif,
              fontSize: "clamp(36px, 6vw, 58px)",
              lineHeight: 1.08,
              margin: "0 0 24px",
              letterSpacing: -0.5,
            }}
          >
            Practice like it's real.
            <br />
            <span style={{ color: T.sageBright, fontStyle: "italic" }}>
              Improve like you mean it.
            </span>
          </h1>

          <p
            style={{
              fontFamily: T.sans,
              fontSize: 18,
              color: T.paperDim,
              lineHeight: 1.6,
              maxWidth: 560,
              margin: "0 auto 44px",
            }}
          >
            A 15-minute, clock-paced AI interview that adapts to your answers in real time and
            hands you a structured report — not a pep talk.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={onStart}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: T.sageBright,
                color: "#0B0D0F",
                border: "none",
                padding: "15px 28px",
                borderRadius: 8,
                fontFamily: T.sans,
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              <Play size={16} fill="#0B0D0F" /> Start Practice
            </button>
            <button
              onClick={onSample}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: T.paper,
                border: `1px solid ${T.stoneLine}`,
                padding: "15px 28px",
                borderRadius: 8,
                fontFamily: T.sans,
                fontWeight: 500,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              <FileText size={16} /> View Sample Report
            </button>
          </div>
        </div>
      </main>

      <div style={{ borderTop: `1px solid ${T.stoneLine}`, padding: "36px 32px 48px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 28,
          }}
        >
          {[
            ["01", "Invite or self-start", "One link starts a structured, timed session — no scheduling."],
            [
              "02",
              "15 minutes, clock-paced",
              "Every session gets the same time budget, so results stay comparable across attempts.",
            ],
            [
              "03",
              "Structured, evidence-based report",
              "Four dimensions, a clear recommendation, and next steps grounded in what you actually said.",
            ],
          ].map(([n, title, body]) => (
            <div key={n}>
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.clayBright, marginBottom: 10 }}>
                {n}
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 17, marginBottom: 8 }}>{title}</div>
              <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.stone, lineHeight: 1.55 }}>
                {body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
