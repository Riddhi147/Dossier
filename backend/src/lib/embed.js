// ---------------------------------------------------------------------------
// Lightweight local text embedding.
//
// Qdrant needs a vector to index/search on. To keep this project runnable
// with ZERO extra embedding-provider credentials, we hash-embed text into a
// fixed-size vector (a bag-of-words feature hash, a.k.a. the "hashing
// trick"). It's deterministic, dependency-free, and good enough to give
// Qdrant real nearest-neighbor structure for concept clustering / retrieval.
//
// SWAP POINT: for materially better semantic retrieval, replace embed() with
// a real embedding model call, e.g.:
//   - Voyage AI (voyage-3) — recommended by Anthropic for RAG
//   - OpenAI text-embedding-3-small
//   - Qdrant Cloud's built-in `cloud_inference` embedding (server-side)
// The rest of qdrant.js only depends on embed() returning a `number[]` of
// length EMBED_DIM, so the swap is confined to this file.
// ---------------------------------------------------------------------------

export const EMBED_DIM = 256;

function hashString(str) {
  // FNV-1a
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function embed(text) {
  const vec = new Array(EMBED_DIM).fill(0);
  const tokens = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const bucket = hashString(token) % EMBED_DIM;
    vec[bucket] += 1;
    // also hash bigrams for a bit more semantic signal
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = tokens[i] + "_" + tokens[i + 1];
    const bucket = hashString(bigram) % EMBED_DIM;
    vec[bucket] += 0.5;
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
