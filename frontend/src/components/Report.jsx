import React, { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { T, RECOMMENDATION_COLOR } from "../theme.js";
import { Logo, ScoreBar } from "./common.jsx";
import { getReport } from "../lib/api.js";

const DIM_LABEL = {
  correctness: "Correctness",
  depth: "Depth",
  relevance: "Relevance",
  communication: "Communication",
};
const DIM_COLOR = {
  correctness: T.sageBright,
  depth: T.gold,
  relevance: T.clayBright,
  communication: "#7B93C4",
};

function durationLabel(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function Report({ sessionId, sampleData, onRestart, isSample }) {
  const [report, setReport] = useState(sampleData || null);
  const [loading, setLoading] = useState(!sampleData);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sampleData || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getReport(sessionId);
        if (!cancelled) setReport(res);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, sampleData]);

  if (loading) {
    return (
      <Shell>
        <div style={{ fontFamily: T.mono, fontSize: 13, color: T.stone, textAlign: "center", paddingTop: 100 }}>
          Building your report…
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div style={{ maxWidth: 420, margin: "100px auto 0", textAlign: "center" }}>
          <AlertCircle size={28} color={T.clayBright} style={{ marginBottom: 16 }} />
          <div style={{ fontFamily: T.serif, fontSize: 20, marginBottom: 10 }}>Couldn't load the report</div>
          <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.stone, lineHeight: 1.6 }}>{error}</div>
        </div>
      </Shell>
    );
  }

  if (!report) return null;

  const overall = report.overall;
  const pct = Math.round((overall / 10) * 100);
  const recColor = RECOMMENDATION_COLOR[report.recommendation] || T.sageBright;
  const dims = report.dims;
  const sortedDims = Object.entries(dims).sort((a, b) => a[1] - b[1]);
  const weakestKey = report.weakest_dimension || sortedDims[0][0];

  return (
    <div style={{ minHeight: "100%", background: T.bg, color: T.paper, fontFamily: T.sans }}>
      <header
        style={{
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${T.stoneLine}`,
        }}
      >
        <Logo />
        {!isSample && (
          <button
            onClick={onRestart}
            style={{
              background: "transparent",
              border: `1px solid ${T.stoneLine}`,
              color: T.paperDim,
              padding: "9px 16px",
              borderRadius: 7,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            New Session
          </button>
        )}
      </header>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 28px 80px" }}>
        {isSample && (
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              color: T.clayBright,
              letterSpacing: 1.5,
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.clayBright, display: "inline-block" }} />
            SAMPLE REPORT
          </div>
        )}

        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.stone, letterSpacing: 1.5, marginBottom: 10 }}>
          PERFORMANCE REPORT
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 34, margin: "0 0 6px" }}>
          {report.role} · {report.seniority}
        </h2>
        <p style={{ color: T.stone, fontSize: 14, marginBottom: 40 }}>
          Session completed {isSample ? "(sample)" : "just now"}
        </p>

        {/* Overall — Aperture-style card */}
        <div
          style={{
            display: "flex",
            gap: 40,
            alignItems: "center",
            padding: "32px 0",
            borderTop: `1px solid ${T.stoneLine}`,
            borderBottom: `1px solid ${T.stoneLine}`,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 60, color: T.gold, lineHeight: 1 }}>
              {pct}
              <span style={{ fontSize: 22, color: T.stone }}>%</span>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.stone, marginTop: 6 }}>
              Overall score · {overall.toFixed(1)}/10
            </div>
          </div>
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: 6,
                background: `${recColor}22`,
                border: `1px solid ${recColor}`,
                color: recColor,
                fontFamily: T.sans,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 14,
              }}
            >
              {report.recommendation}
            </div>
            <div style={{ display: "flex", gap: 28, fontFamily: T.sans, fontSize: 13, color: T.stone, flexWrap: "wrap" }}>
              <span>
                <Clock size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                {durationLabel(report.durationSec)}
              </span>
              <span>{report.questionsAnswered} answers evaluated</span>
              {report.benchmark && (
                <span>
                  vs. {report.benchmark.sampleSize} peer{report.benchmark.sampleSize === 1 ? "" : "s"} at this level
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 48 }}>
          {/* Key scores */}
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.stone, letterSpacing: 1.2, marginBottom: 18 }}>
              KEY SCORES
            </div>
            {Object.entries(dims).map(([k, v]) => (
              <ScoreBar key={k} label={DIM_LABEL[k]} value={v} color={DIM_COLOR[k]} />
            ))}
            {report.benchmark && (
              <div style={{ marginTop: 14, fontFamily: T.sans, fontSize: 12, color: T.stone, lineHeight: 1.6 }}>
                Peer average at {report.seniority} level: {report.benchmark.overall.toFixed(1)}/10
              </div>
            )}
          </div>

          {/* Difficulty progression */}
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.stone, letterSpacing: 1.2, marginBottom: 18 }}>
              DIFFICULTY PROGRESSION
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 90, marginBottom: 10 }}>
              {(report.difficultyHistory || []).map((d, i) => {
                const h = { beginner: 30, intermediate: 60, advanced: 90 }[d] || 45;
                return (
                  <div key={i} style={{ flex: 1, height: h, background: T.stoneLine, borderRadius: 4, position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        width: "100%",
                        height: h,
                        background: T.gold,
                        borderRadius: 4,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.paperDim, lineHeight: 1.6 }}>
              Started at <b style={{ color: T.paper }}>{report.difficultyHistory?.[0]}</b>, adapted based on
              response quality across {report.questionsAnswered} questions.
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div style={{ marginBottom: 48, padding: 24, background: T.bgCard, borderRadius: 10, border: `1px solid ${T.stoneLine}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.stone, letterSpacing: 1.2, marginBottom: 14 }}>
            AI SUMMARY
          </div>
          <p style={{ fontFamily: T.serif, fontSize: 16.5, lineHeight: 1.7, color: T.paperDim, margin: 0 }}>
            {report.summary}
          </p>
        </div>

        {/* Improvement plan */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.stone, letterSpacing: 1.2, marginBottom: 20 }}>
            BIGGEST IMPROVEMENT AREA
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.serif, fontSize: 20 }}>{DIM_LABEL[weakestKey]}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.stone }}>{dims[weakestKey].toFixed(1)}/10</span>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.paperDim, lineHeight: 1.6, margin: "0 0 14px", maxWidth: 620 }}>
              {report.weakest_dimension_note}
            </p>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.stone, letterSpacing: 0.8, marginBottom: 10 }}>
              PRACTICE NEXT
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontFamily: T.sans, fontSize: 13.5, color: T.paperDim, lineHeight: 2 }}>
              {(report.improvement_actions || []).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        {!isSample && (
          <button
            onClick={onRestart}
            style={{
              marginTop: 20,
              background: T.sageBright,
              color: "#0B0D0F",
              border: "none",
              padding: "14px 26px",
              borderRadius: 8,
              fontFamily: T.sans,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Start Another Session
          </button>
        )}
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100%", background: T.bg, color: T.paper, fontFamily: T.sans }}>
      <header style={{ padding: "20px 32px", borderBottom: `1px solid ${T.stoneLine}` }}>
        <Logo />
      </header>
      {children}
    </div>
  );
}
