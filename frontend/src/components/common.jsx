import React from "react";
import { T } from "../theme.js";

export function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          border: `1.5px solid ${T.sageBright}`,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 8, height: 8, background: T.sageBright, borderRadius: "50%" }} />
      </div>
      <span style={{ fontFamily: T.serif, fontSize: 17, color: T.paper, letterSpacing: 0.2 }}>
        Dossier
      </span>
    </div>
  );
}

export function ScoreBar({ label, value, max = 10, color = T.sageBright }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontFamily: T.sans,
          fontSize: 13,
        }}
      >
        <span style={{ color: T.paperDim }}>{label}</span>
        <span style={{ color: T.paper, fontFamily: T.mono }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, background: T.stoneLine, borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}
