import React, { useState } from "react";
import { ArrowLeft, ChevronRight, AlertCircle } from "lucide-react";
import { T, ROLES, SENIORITIES } from "../theme.js";
import { Logo } from "./common.jsx";

export default function Setup({ onBack, onBegin, healthWarning }) {
  const [role, setRole] = useState(ROLES[0]);
  const [seniority, setSeniority] = useState(SENIORITIES[1]);
  const [mode, setMode] = useState("voice");
  const [submitting, setSubmitting] = useState(false);

  const field = (label, children) => (
    <div style={{ marginBottom: 30 }}>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 11,
          letterSpacing: 1.2,
          color: T.stone,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );

  const pillRow = (options, value, setValue) => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => setValue(opt)}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            fontFamily: T.sans,
            fontSize: 14,
            border: `1px solid ${value === opt ? T.sageBright : T.stoneLine}`,
            background: value === opt ? "rgba(91,122,110,0.15)" : "transparent",
            color: value === opt ? T.sageBright : T.paperDim,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  async function handleBegin() {
    setSubmitting(true);
    try {
      await onBegin({ role, seniority, mode });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", background: T.bg, color: T.paper, fontFamily: T.sans }}>
      <header
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderBottom: `1px solid ${T.stoneLine}`,
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: T.stone, cursor: "pointer", display: "flex" }}
        >
          <ArrowLeft size={18} />
        </button>
        <Logo />
      </header>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.clayBright, letterSpacing: 1.5, marginBottom: 10 }}>
          SESSION SETUP
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 32, margin: "0 0 12px" }}>
          Set up your 15-minute interview
        </h2>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.stone, margin: "0 0 40px", lineHeight: 1.6 }}>
          The clock starts when your first question is asked and runs for the full session —
          answer at your own pace within it.
        </p>

        {healthWarning && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: "rgba(181,98,62,0.1)",
              border: `1px solid ${T.clay}`,
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 32,
              fontFamily: T.sans,
              fontSize: 13,
              color: T.clayBright,
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{healthWarning}</span>
          </div>
        )}

        {field("Role", pillRow(ROLES, role, setRole))}
        {field("Seniority", pillRow(SENIORITIES, seniority, setSeniority))}
        {field("Interview Mode", pillRow(["voice", "text"], mode, setMode))}

        <button
          onClick={handleBegin}
          disabled={submitting}
          style={{
            width: "100%",
            marginTop: 12,
            background: T.sageBright,
            color: "#0B0D0F",
            border: "none",
            padding: "16px",
            borderRadius: 8,
            fontFamily: T.sans,
            fontWeight: 600,
            fontSize: 15,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {submitting ? "Starting…" : <>Begin Interview <ChevronRight size={17} /></>}
        </button>
      </div>
    </div>
  );
}
