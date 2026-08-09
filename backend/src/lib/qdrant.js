// ---------------------------------------------------------------------------
// Qdrant integration: this is the system's long-term memory.
//
// Every evaluated answer is stored as a point: {vector, payload}. The
// payload carries everything needed to reconstruct a session's report and
// to benchmark across sessions for the same role/seniority — this is what
// TDR section 8 (Conversation Memory & Retrieval) and section 14 (Peer
// Benchmarking) actually mean in a real implementation.
// ---------------------------------------------------------------------------

import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import { embed, EMBED_DIM } from "./embed.js";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION = process.env.QDRANT_COLLECTION || "interview_answers";

export const qdrantEnabled = Boolean(QDRANT_URL);

let client = null;
let ensured = false;

if (qdrantEnabled) {
  client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY || undefined,
  });
} else {
  console.warn(
    "[qdrant] QDRANT_URL not set — conversation memory and benchmarking will " +
      "be skipped. Sessions still work using in-process history only."
  );
}

async function ensureCollection() {
  if (ensured || !client) return;
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);
  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: EMBED_DIM, distance: "Cosine" },
    });
  }
  ensured = true;
}

/**
 * Store one evaluated Q&A turn as a Qdrant point.
 */
export async function storeAnswer({
  sessionId,
  role,
  seniority,
  questionIndex,
  question,
  answer,
  concept,
  difficulty,
  evaluation,
}) {
  if (!client) return null;
  await ensureCollection();

  const point = {
    id: uuidv4(),
    vector: embed(`${question} ${answer}`),
    payload: {
      sessionId,
      role,
      seniority,
      questionIndex,
      question,
      answer,
      concept,
      difficulty,
      correctness: evaluation.correctness,
      depth: evaluation.depth,
      relevance: evaluation.relevance,
      communication: evaluation.communication,
      overall: evaluation.overall,
      createdAt: new Date().toISOString(),
    },
  };

  await client.upsert(COLLECTION, { points: [point] });
  return point.id;
}

/**
 * Retrieve every stored turn for a session, in question order.
 */
export async function getSessionAnswers(sessionId) {
  if (!client) return [];
  await ensureCollection();

  const result = await client.scroll(COLLECTION, {
    filter: {
      must: [{ key: "sessionId", match: { value: sessionId } }],
    },
    limit: 200,
    with_payload: true,
    with_vector: false,
  });

  return result.points
    .map((p) => p.payload)
    .sort((a, b) => a.questionIndex - b.questionIndex);
}

/**
 * Retrieve semantically similar past answers for a concept — used to give
 * the adaptive engine cross-session context (e.g. "candidates at this level
 * usually also get asked about X after Y").
 */
export async function findSimilarAnswers(text, { role, limit = 5 } = {}) {
  if (!client) return [];
  await ensureCollection();

  const vector = embed(text);
  const filter = role ? { must: [{ key: "role", match: { value: role } }] } : undefined;

  const result = await client.search(COLLECTION, {
    vector,
    filter,
    limit,
    with_payload: true,
  });

  return result.map((r) => ({ score: r.score, ...r.payload }));
}

/**
 * Peer benchmark: average dimension scores across all *other* sessions for
 * the same role + seniority, for the "where do I stand" comparison in the
 * report (TDR section 14).
 */
export async function benchmarkForRole({ role, seniority, excludeSessionId }) {
  if (!client) return null;
  await ensureCollection();

  const result = await client.scroll(COLLECTION, {
    filter: {
      must: [
        { key: "role", match: { value: role } },
        { key: "seniority", match: { value: seniority } },
      ],
    },
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  const points = result.points
    .map((p) => p.payload)
    .filter((p) => p.sessionId !== excludeSessionId);

  if (points.length === 0) return null;

  const avg = (key) => points.reduce((s, p) => s + p[key], 0) / points.length;
  return {
    sampleSize: new Set(points.map((p) => p.sessionId)).size,
    correctness: avg("correctness"),
    depth: avg("depth"),
    relevance: avg("relevance"),
    communication: avg("communication"),
    overall: avg("overall"),
  };
}
