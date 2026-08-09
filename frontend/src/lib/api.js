const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

export function getHealth() {
  return request("/api/health");
}

export function startSession({ role, seniority, mode, durationSec }) {
  return request("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ role, seniority, mode, durationSec }),
  });
}

export function submitAnswer(sessionId, answer) {
  return request(`/api/sessions/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export function getReport(sessionId) {
  return request(`/api/sessions/${sessionId}/report`);
}

/**
 * Fetch synthesized speech from the backend (which proxies Rime) and
 * return a playable object URL. Throws if Rime isn't configured server-side
 * — callers should catch and fall back to browser speechSynthesis.
 */
export async function fetchTtsAudioUrl(text, speaker) {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speaker }),
  });
  if (!res.ok) {
    throw new Error(`TTS request failed (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export { API_BASE };
