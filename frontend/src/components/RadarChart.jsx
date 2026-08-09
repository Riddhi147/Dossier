import React from "react";

// Simple Radar (spider) chart component for four dimensions (0‑10 range)
// Props: data = { correctness, depth, relevance, communication }
// The chart is rendered with SVG. Values are normalized to a radius of 100.
export default function RadarChart({ data, size = 200 }) {
  const dims = [
    { key: "correctness", label: "Correctness", value: data.correctness },
    { key: "depth", label: "Depth", value: data.depth },
    { key: "relevance", label: "Relevance", value: data.relevance },
    { key: "communication", label: "Communication", value: data.communication },
  ];

  const radius = size / 2;
  const maxVal = 10;
  const angleStep = (2 * Math.PI) / dims.length;

  // Build points for the polygon representing the scores
  const points = dims
    .map((d, i) => {
      const r = (d.value / maxVal) * radius;
      const angle = -Math.PI / 2 + i * angleStep; // start at top
      const x = radius + r * Math.cos(angle);
      const y = radius + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");

  // Build grid lines (concentric polygons) at 25%, 50%, 75%, 100%
  const gridPolygons = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background grid */}
      {gridPolygons.map((p, idx) => (
        <polygon
          key={idx}
          points={dims
            .map((_, i) => {
              const r = p * radius;
              const angle = -Math.PI / 2 + i * angleStep;
              const x = radius + r * Math.cos(angle);
              const y = radius + r * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#444"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {dims.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = radius + radius * Math.cos(angle);
        const y = radius + radius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={radius}
            y1={radius}
            x2={x}
            y2={y}
            stroke="#555"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon points={points} fill="rgba(255,215,0,0.4)" stroke="#FFD700" strokeWidth="2" />

      {/* Labels */}
      {dims.map((d, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const labelRadius = radius + 15;
        const x = radius + labelRadius * Math.cos(angle);
        const y = radius + labelRadius * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fill="#DDD"
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
