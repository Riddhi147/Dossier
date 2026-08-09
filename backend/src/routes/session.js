import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import * as llm from "../lib/llm.js";
import * as qdrant from "../lib/qdrant.js";
import {
  difficultyForSeniority,
  pickFallbackQuestion,
  fallbackEvaluate,
} from "../data/questionBank.js";

const router = Router();

// In-memory session store. Swap for Redis/Postgres for a multi-instance
// deployment — the shape stored here is intentionally small and JSON-safe.
const sessions = new Map();

const MAX_QUESTIONS = 8;
const DEFAULT_DURATION_SEC = 15 * 60; // clock-paced, Aperture-style

function publicQuestionPayload(session) {
  return {
    sessionId: session.id,
    question: session.currentQuestion,
    concept: session.currentConcept,
    difficulty: session.difficulty,
    questionIndex: session.questionIndex,
    maxQuestions: MAX_QUESTIONS,
    durationSec: session.durationSec,
    startedAt: session.startedAt,
  };
}

// POST /api/sessions  { role, seniority, mode, durationSec? }
router.post("/", async (req, res) => {
  try {
    const { role, seniority, mode = "voice", durationSec } = req.body || {};
    if (!role || !seniority) {
      return res.status(400).json({ error: "role and seniority are required" });
    }

    const difficulty = difficultyForSeniority(seniority);
    let opening;

    if (llm.llmEnabled) {
      opening = await llm.generateOpeningQuestion({ role, seniority });
    } else {
      const fallback = pickFallbackQuestion(role, difficulty, []);
      opening = { question: fallback.question, concept: fallback.concept, difficulty };
    }

    const session = {
      id: uuidv4(),
      role,
      seniority,
      mode,
      difficulty: opening.difficulty || difficulty,
      questionIndex: 0,
      currentQuestion: opening.question,
      currentConcept: opening.concept,
      askedQuestions: [opening.question],
      history: [], // [{question, concept, difficulty, answer, evaluation}]
      startedAt: Date.now(),
      durationSec: durationSec || DEFAULT_DURATION_SEC,
    };

    sessions.set(session.id, session);
    res.json(publicQuestionPayload(session));
  } catch (err) {
    console.error("[POST /api/sessions]", err);
    res.status(500).json({ error: "Failed to start session", detail: String(err.message || err) });
  }
});

// POST /api/sessions/:id/answer  { answer }
router.post("/:id/answer", async (req, res) => {
  try {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const { answer } = req.body || {};
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: "answer is required" });
    }

    const elapsedSec = Math.floor((Date.now() - session.startedAt) / 1000);
    const timeUp = elapsedSec >= session.durationSec;

    // --- Evaluate ---
    const evaluation = llm.llmEnabled
      ? await llm.evaluateAnswer({
          role: session.role,
          seniority: session.seniority,
          question: session.currentQuestion,
          answer,
        })
      : fallbackEvaluate(answer);

    const turn = {
      question: session.currentQuestion,
      concept: session.currentConcept,
      difficulty: session.difficulty,
      answer,
      evaluation,
    };
    session.history.push(turn);

    // --- Store in Qdrant (memory / retrieval / benchmarking) ---
    qdrant
      .storeAnswer({
        sessionId: session.id,
        role: session.role,
        seniority: session.seniority,
        questionIndex: session.questionIndex,
        question: turn.question,
        answer: turn.answer,
        concept: evaluation.concept || turn.concept,
        difficulty: turn.difficulty,
        evaluation,
      })
      .catch((err) => console.error("[qdrant.storeAnswer]", err));

    const nextIndex = session.questionIndex + 1;
    const done = timeUp || nextIndex >= MAX_QUESTIONS;

    if (done) {
      sessions.set(session.id, session);
      return res.json({ evaluation, done: true, remainingSec: Math.max(0, session.durationSec - elapsedSec) });
    }

    // --- Adaptive next question ---
    let next;
    if (llm.llmEnabled) {
      next = await llm.generateNextQuestion({
        role: session.role,
        seniority: session.seniority,
        difficulty: session.difficulty,
        history: session.history,
      });
    } else {
      const strong = evaluation.overall >= 7;
      const weak = evaluation.overall < 5;
      let nextDifficulty = session.difficulty;
      if (strong && session.difficulty !== "advanced") {
        nextDifficulty = session.difficulty === "beginner" ? "intermediate" : "advanced";
      } else if (weak && session.difficulty !== "beginner") {
        nextDifficulty = session.difficulty === "advanced" ? "intermediate" : "beginner";
      }
      const fallback = pickFallbackQuestion(session.role, nextDifficulty, session.askedQuestions);
      next = { question: fallback.question, concept: fallback.concept, difficulty: nextDifficulty };
    }

    session.questionIndex = nextIndex;
    session.difficulty = next.difficulty || session.difficulty;
    session.currentQuestion = next.question;
    session.currentConcept = next.concept;
    session.askedQuestions.push(next.question);
    sessions.set(session.id, session);

    res.json({
      evaluation,
      done: false,
      ...publicQuestionPayload(session),
      remainingSec: Math.max(0, session.durationSec - elapsedSec),
    });
  } catch (err) {
    console.error("[POST /api/sessions/:id/answer]", err);
    res.status(500).json({ error: "Failed to process answer", detail: String(err.message || err) });
  }
});

// GET /api/sessions/:id/report
router.get("/:id/report", async (req, res) => {
  try {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.history.length === 0) {
      return res.status(400).json({ error: "No answers recorded yet for this session" });
    }

    const avg = (key) =>
      session.history.reduce((s, h) => s + h.evaluation[key], 0) / session.history.length;
    const dims = {
      correctness: avg("correctness"),
      depth: avg("depth"),
      relevance: avg("relevance"),
      communication: avg("communication"),
    };
    const overall = (dims.correctness + dims.depth + dims.relevance + dims.communication) / 4;

      const fillerWords = ["um", "uh", "like", "basically", "actually", "literally", "stuff", "so", "right", "okay"]; // Define filler words list
      // Calculate total words and filler count across all answers
      const allAnswers = session.history.map(h => h.answer).join(' ');
      const words = allAnswers.toLowerCase().match(/\b\w+\b/g) || [];
      const totalWordCount = words.length;
      const fillerCount = words.filter(word => fillerWords.includes(word)).length;
      const fillerPer100 = totalWordCount > 0 ? (fillerCount / totalWordCount) * 100 : 0;

      // Derive strengths and weaknesses based on dimension scores
      const dimEntries = Object.entries(dims);
      const sortedDesc = [...dimEntries].sort((a, b) => b[1] - a[1]);
      const strengths = sortedDesc.slice(0, 2).map(entry => entry[0]); // top 2 dimensions
      const weaknesses = [sortedDesc[sortedDesc.length - 1][0]]; // weakest dimension (same as weakest_dimension)

    let aiReport;
    if (llm.llmEnabled) {
      aiReport = await llm.generateReport({
        role: session.role,
        seniority: session.seniority,
        history: session.history,
        dims,
        overall,
      });
    } else {
      const sorted = Object.entries(dims).sort((a, b) => a[1] - b[1]);
      aiReport = {
        recommendation: overall >= 8 ? "Strong Hire" : overall >= 6.5 ? "Hire" : overall >= 5 ? "Leaning Hire" : "Not Ready",
        summary:
          "Demo-mode summary (no LLM configured): scores are derived from a keyword " +
          "heuristic rather than real evaluation. Configure ANTHROPIC_API_KEY for a " +
          "real evidence-based summary.",
        weakest_dimension: sorted[0][0],
        weakest_dimension_note: "Lowest-scoring dimension across this session.",
        improvement_actions: [
          "Lead with the direct answer, then justify it.",
          "Explore trade-offs, not just definitions.",
          "Restate the question before answering to stay on-topic.",
        ],
      };
    }

    let benchmark = null;
    try {
      benchmark = await qdrant.benchmarkForRole({
        role: session.role,
        seniority: session.seniority,
        excludeSessionId: session.id,
      });
    } catch (err) {
      console.error("[qdrant.benchmarkForRole]", err);
    }

      // Build final response JSON, merging AI report and additional metrics
      const finalReport = {
        ...aiReport,
        strengths,
        weaknesses,
        fillerWordsPer100: Number(fillerPer100.toFixed(2)),
      };

      res.json({
        sessionId: session.id,
        role: session.role,
        seniority: session.seniority,
        durationSec: Math.floor((Date.now() - session.startedAt) / 1000),
        questionsAnswered: session.history.length,
        dims,
        overall,
        difficultyHistory: session.history.map((h) => h.difficulty),
        transcript: session.history.map((h) => ({ question: h.question, answer: h.answer, overall: h.evaluation.overall, concept: h.concept || h.evaluation.concept })),
        benchmark,
        ...finalReport,
      });
      return;

  } catch (err) {
    console.error("[GET /api/sessions/:id/report]", err);
    res.status(500).json({ error: "Failed to build report", detail: String(err.message || err) });
  }
});

export default router;
