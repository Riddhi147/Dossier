// ---------------------------------------------------------------------------
// Fallback content used only in DEMO MODE (no ANTHROPIC_API_KEY configured).
// A real deployment should always set the key so llm.js drives question
// generation, evaluation, and adaptation for real.
// ---------------------------------------------------------------------------

export const QUESTION_BANK = {
  "Backend Engineering": {
    beginner: [
      { question: "What is the difference between a cache and a database?", concept: "caching-fundamentals" },
      { question: "Explain what an API endpoint is, in your own words.", concept: "api-basics" },
    ],
    intermediate: [
      { question: "Tell me how caching works in a backend system.", concept: "caching" },
      { question: "How would you design rate limiting for a public API?", concept: "rate-limiting" },
    ],
    advanced: [
      { question: "How would you handle cache invalidation in a distributed system?", concept: "distributed-caching" },
      { question: "How would you debug a service with intermittent P99 latency spikes?", concept: "performance-debugging" },
    ],
  },
  "Data Structures": {
    beginner: [
      { question: "What's the difference between an array and a linked list?", concept: "arrays-vs-lists" },
    ],
    intermediate: [
      { question: "How does a hash map handle collisions?", concept: "hash-maps" },
    ],
    advanced: [
      { question: "Explain the trade-offs between a B-tree and an LSM tree for a database index.", concept: "storage-engines" },
    ],
  },
  "Product Management": {
    beginner: [
      { question: "How do you decide what to build next?", concept: "prioritization-basics" },
    ],
    intermediate: [
      { question: "Walk me through how you'd prioritize a backlog with limited engineering capacity.", concept: "prioritization" },
    ],
    advanced: [
      { question: "A key metric is improving but user complaints are rising. How do you investigate?", concept: "metric-diagnosis" },
    ],
  },
};

const SENIORITY_TO_DIFFICULTY = {
  "Entry-level": "beginner",
  "Mid-level": "intermediate",
  "Senior": "advanced",
  "Staff+": "advanced",
};

export function difficultyForSeniority(seniority) {
  return SENIORITY_TO_DIFFICULTY[seniority] || "intermediate";
}

export function pickFallbackQuestion(role, difficulty, askedQuestions = []) {
  const roleBank = QUESTION_BANK[role] || QUESTION_BANK["Backend Engineering"];
  const pool = roleBank[difficulty] || roleBank.intermediate;
  const unused = pool.find((p) => !askedQuestions.includes(p.question));
  return unused || pool[askedQuestions.length % pool.length];
}

export function fallbackEvaluate(answerText) {
  const text = (answerText || "").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const strongSignals = ["because", "trade-off", "tradeoff", "for example", "specifically", "however", "instead"];
  const hedges = ["i think", "maybe", "not sure", "kind of", "um"];
  const hits = strongSignals.filter((s) => text.includes(s)).length;
  const hedgeHits = hedges.filter((s) => text.includes(s)).length;

  const clamp = (n) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));
  const correctness = clamp(4 + hits * 1.3 + Math.min(wordCount / 15, 3));
  const depth = clamp(2 + hits * 1.6 + Math.min(wordCount / 12, 3) - hedgeHits * 0.8);
  const relevance = clamp(5 + hits * 0.9 + (wordCount > 8 ? 1.5 : -1));
  const communication = clamp(10 - Math.abs(wordCount - 45) / 12 - hedgeHits * 1.2);
  const overall = clamp((correctness + depth + relevance + communication) / 4);

  return {
    correctness,
    correctness_note: "Heuristic demo-mode score (no LLM configured).",
    depth,
    depth_note: "Heuristic demo-mode score (no LLM configured).",
    relevance,
    relevance_note: "Heuristic demo-mode score (no LLM configured).",
    communication,
    communication_note: "Heuristic demo-mode score (no LLM configured).",
    concept: "general",
    overall,
  };
}
