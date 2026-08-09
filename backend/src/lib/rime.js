// ---------------------------------------------------------------------------
// Rime integration: turns interviewer question text into spoken audio.
// Docs: https://docs.rime.ai/docs/quickstart-five-minute
//
// The API key stays server-side on purpose — never ship it to the browser.
// The frontend calls POST /api/tts on THIS backend, which proxies to Rime.
// ---------------------------------------------------------------------------

const RIME_API_KEY = process.env.RIME_API_KEY;
const RIME_SPEAKER = process.env.RIME_SPEAKER || "celeste";
const RIME_MODEL = process.env.RIME_MODEL || "coda";
const RIME_URL = "https://users.rime.ai/v1/rime-tts";

export const rimeEnabled = Boolean(RIME_API_KEY);

if (!rimeEnabled) {
  console.warn(
    "[rime] RIME_API_KEY not set — /api/tts will return 501 and the frontend " +
      "will fall back to the browser's built-in speech synthesis."
  );
}

/**
 * Synthesize speech for the given text.
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
export async function synthesizeSpeech(text, { speaker, format = "wav" } = {}) {
  if (!rimeEnabled) {
    throw new Error("Rime is not configured (missing RIME_API_KEY)");
  }

  const accept = format === "mp3" ? "audio/mp3" : "audio/wav";

  const res = await fetch(RIME_URL, {
    method: "POST",
    headers: {
      Accept: accept,
      Authorization: `Bearer ${RIME_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      speaker: speaker || RIME_SPEAKER,
      modelId: RIME_MODEL,
      lang: "eng",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Rime TTS error ${res.status}: ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: accept };
}
