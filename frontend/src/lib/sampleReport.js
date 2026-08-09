// Static sample used by the "View Sample Report" CTA on the landing page,
// so a visitor can see the report format without running a live session
// (and without needing any backend credentials configured).
export const SAMPLE_REPORT = {
  role: "Backend Engineering",
  seniority: "Mid-level",
  durationSec: 612,
  questionsAnswered: 5,
  dims: { correctness: 7.4, depth: 5.8, relevance: 8.1, communication: 6.3 },
  overall: 6.9,
  recommendation: "Leaning Hire",
  summary:
    "Correctness and relevance were consistently strong — the caching and rate-limiting " +
    "answers were technically sound and stayed on-topic. Depth was the weak point: several " +
    "answers (notably the load-balancing question) named the right concept but stopped at a " +
    "definition rather than explaining trade-offs. Communication ran long in the burst-handling " +
    "follow-up, where hedging language ('I'm not totally sure') undercut an otherwise reasonable answer.",
  weakest_dimension: "depth",
  weakest_dimension_note:
    "The load-balancing answer named an algorithm but never explained why you'd choose it over " +
    "another, and the burst-handling follow-up trailed off before reaching a conclusion.",
  improvement_actions: [
    "Compare two competing approaches and articulate the trade-off out loud",
    "Explain not just what a system does, but why it's designed that way",
    "Push one level past the textbook definition each time you answer",
  ],
  difficultyHistory: ["intermediate", "advanced", "advanced", "advanced", "intermediate"],
  benchmark: { sampleSize: 12, overall: 6.4, correctness: 7.0, depth: 5.9, relevance: 7.5, communication: 6.1 },
};
