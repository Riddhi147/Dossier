// ---------------------------------------------------------------------------
// Claude integration: question generation, answer evaluation, adaptive
// follow-up routing, and final report synthesis.
//
// All calls go through a single `callClaude` helper against the public
// Anthropic Messages API. Every prompt in this file asks for STRICT JSON
// output so the rest of the backend can treat the LLM as a typed function.
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export const llmEnabled = Boolean(ANTHROPIC_API_KEY);

if (!llmEnabled) {
  console.warn(
    "[llm] ANTHROPIC_API_KEY not set — falling back to the static question bank " +
      "and a heuristic evaluator. Set the key to enable real adaptive interviewing."
  );
}

async function callClaude({ system, prompt, maxTokens = 1024 }) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

function parseJSON(text) {
  const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, "");
  return JSON.parse(cleaned);
}

const INTERVIEWER_SYSTEM = `You are an experienced, fair technical interviewer conducting a structured,
adaptive interview. You ask one focused question at a time, evaluate answers
rigorously across four dimensions, and adjust difficulty based on demonstrated
skill — never on how the candidate feels, only on what they actually said.
You always respond with strict JSON only: no prose, no markdown fences, no
commentary outside the JSON object.`;

/**
 * Generate the opening question for a session.
 */
export async function generateOpeningQuestion({ role, seniority }) {
  const prompt = `Role: ${role}
Seniority: ${seniority}

Generate the FIRST question for a structured interview at this role and
seniority level. It should be a well-scoped question that lets a candidate
demonstrate real understanding within 1-2 minutes of spoken answer.

Respond with JSON exactly in this shape:
{"question": "...", "concept": "kebab-case-topic-tag", "difficulty": "beginner" | "intermediate" | "advanced"}`;

  const raw = await callClaude({ system: INTERVIEWER_SYSTEM, prompt, maxTokens: 300 });
  return parseJSON(raw);
}

/**
 * Evaluate a candidate's answer across four dimensions.
 */
export async function evaluateAnswer({ role, seniority, question, answer }) {
  const prompt = `Role: ${role}
Seniority: ${seniority}
Question asked: "${question}"
Candidate's answer (verbatim transcript): "${answer}"

Score the answer from 0-10 (decimals allowed) on each of these four
dimensions, independently:
- correctness: is the technical/factual content accurate?
- depth: does it go beyond a surface definition into mechanics, trade-offs, or reasoning?
- relevance: does it directly answer what was asked?
- communication: is it clearly structured and easy to follow?

Also extract a short kebab-case concept tag summarizing what the answer was
actually about (for cross-question memory).

Respond with JSON exactly in this shape:
{
  "correctness": 0.0, "correctness_note": "...",
  "depth": 0.0, "depth_note": "...",
  "relevance": 0.0, "relevance_note": "...",
  "communication": 0.0, "communication_note": "...",
  "concept": "kebab-case-tag"
}`;

  const raw = await callClaude({ system: INTERVIEWER_SYSTEM, prompt, maxTokens: 500 });
  const parsed = parseJSON(raw);
  const overall =
    (parsed.correctness + parsed.depth + parsed.relevance + parsed.communication) / 4;
  return { ...parsed, overall: Math.round(overall * 10) / 10 };
}

/**
 * Decide and generate the next question given full session history so far.
 * This is where adaptive difficulty + follow-up depth actually happens.
 */
export async function generateNextQuestion({ role, seniority, difficulty, history }) {
  const transcript = history
    .map(
      (h, i) =>
        `Q${i + 1} (${h.difficulty}): ${h.question}\nA${i + 1}: ${h.answer}\nScores: correctness=${h.evaluation.correctness}, depth=${h.evaluation.depth}, relevance=${h.evaluation.relevance}, communication=${h.evaluation.communication}, overall=${h.evaluation.overall}`
    )
    .join("\n\n");

  const last = history[history.length - 1];

  const prompt = `Role: ${role}
Seniority: ${seniority}
Current difficulty: ${difficulty}

Interview transcript so far:
${transcript}

The candidate's most recent answer scored ${last.evaluation.overall}/10 overall
on the topic "${last.evaluation.concept}".

Decide the next question using this policy:
- overall > 7: increase difficulty and ask a deeper follow-up that pushes on
  a specific detail, trade-off, or edge case from their last answer.
- overall 5-7: keep difficulty roughly the same and explore an adjacent
  aspect of the same or a related concept.
- overall < 5: decrease difficulty and ask a more fundamental question,
  ideally one that re-grounds the concept they struggled with.

Never repeat a question already asked. Reference specific things the
candidate actually said when it makes the question sharper.

Respond with JSON exactly in this shape:
{"question": "...", "concept": "kebab-case-topic-tag", "difficulty": "beginner" | "intermediate" | "advanced", "is_followup": true | false}`;

  const raw = await callClaude({ system: INTERVIEWER_SYSTEM, prompt, maxTokens: 350 });
  return parseJSON(raw);
}

/**
 * Generate the closing AI summary + recommendation for the report.
 */
export async function generateReport({ role, seniority, history, dims, overall }) {
  const transcript = history
    .map(
      (h, i) =>
        `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}\nOverall score: ${h.evaluation.overall}/10`
    )
    .join("\n\n");

  const prompt = `Role: ${role}
Seniority: ${seniority}
Overall score: ${overall.toFixed(1)}/10
Dimension averages: correctness=${dims.correctness.toFixed(1)}, depth=${dims.depth.toFixed(
    1
  )}, relevance=${dims.relevance.toFixed(1)}, communication=${dims.communication.toFixed(1)}

Full transcript:
${transcript}

Write a performance report for this candidate. Reference specific things
they actually said — no generic filler like "good job, keep practicing."

Respond with JSON exactly in this shape:
{
  "recommendation": "Strong Hire" | "Hire" | "Leaning Hire" | "Not Ready",
  "summary": "2-4 sentence evidence-based summary referencing specific answers",
  "weakest_dimension": "correctness" | "depth" | "relevance" | "communication",
  "weakest_dimension_note": "1-2 sentences on why, referencing a specific answer",
  "improvement_actions": ["...", "...", "..."]
}`;

  const raw = await callClaude({ system: INTERVIEWER_SYSTEM, prompt, maxTokens: 600 });
  return parseJSON(raw);
}
