import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Clock, Sparkles, AlertCircle } from "lucide-react";
import { T } from "../theme.js";
import { Logo } from "./common.jsx";
import { startSession, submitAnswer } from "../lib/api.js";
import { speak, useSpeechToText } from "../lib/speech.js";

function elapsedLabel(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function LiveInterview({ config, onFinish, onError }) {
  const [phase, setPhase] = useState("starting"); // starting | speaking | listening | thinking | done
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(8);
  const [durationSec, setDurationSec] = useState(15 * 60);
  const [remainingSec, setRemainingSec] = useState(15 * 60);
  const [transcriptLog, setTranscriptLog] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [followupCount, setFollowupCount] = useState(0);
  const [difficultyHistory, setDifficultyHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const stt = useSpeechToText();
  const startedAtRef = useRef(null);
  const finishedRef = useRef(false);

  // Start the session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await startSession(config);
        if (cancelled) return;
        setSessionId(res.sessionId);
        setCurrentQuestion(res.question);
        setDifficulty(res.difficulty);
        setQuestionIndex(res.questionIndex);
        setMaxQuestions(res.maxQuestions);
        setDurationSec(res.durationSec);
        setRemainingSec(res.durationSec);
        setDifficultyHistory([res.difficulty]);
        startedAtRef.current = Date.now();
        askQuestion(res.question);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message);
          onError && onError(err.message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer, clock-paced regardless of turn state
  useEffect(() => {
    if (!startedAtRef.current || phase === "done") return;
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);
      setRemainingSec(remaining);
      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        finishSession();
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec, phase]);

  function askQuestion(questionText) {
    setPhase("speaking");
    setTranscriptLog((prev) => [
      ...prev,
      { role: "ai", text: questionText, ts: elapsedLabel(Math.floor((Date.now() - startedAtRef.current) / 1000)) },
    ]);
    if (config.mode === "voice") {
      speak(questionText, {
        onStart: () => setPhase("speaking"),
        onEnd: () => setPhase("listening"),
      });
    } else {
      setPhase("listening");
    }
  }

  function finishSession() {
    setPhase("done");
    onFinish({ sessionId, config, transcriptLog, followupCount, difficultyHistory });
  }

  async function handleSubmitAnswer(answerText) {
    if (!answerText || !answerText.trim() || !sessionId) return;
    setPhase("thinking");
    setTranscriptLog((prev) => [
      ...prev,
      { role: "user", text: answerText, ts: elapsedLabel(Math.floor((Date.now() - startedAtRef.current) / 1000)) },
    ]);

    try {
      const res = await submitAnswer(sessionId, answerText);

      if (res.done || finishedRef.current) {
        finishedRef.current = true;
        finishSession();
        return;
      }

      const nextIndex = res.questionIndex;
      const isFollowup = nextIndex === questionIndex + 1 && res.difficulty !== difficulty;
      if (isFollowup) setFollowupCount((f) => f + 1);

      setDifficulty(res.difficulty);
      setDifficultyHistory((prev) => [...prev, res.difficulty]);
      setQuestionIndex(nextIndex);
      setCurrentQuestion(res.question);
      stt.reset();
      setTextInput("");
      askQuestion(res.question);
    } catch (err) {
      setErrorMsg(err.message);
      setPhase("listening");
    }
  }

  const difficultyPct = { beginner: 33, intermediate: 66, advanced: 100 }[difficulty] || 50;
  const liveTranscript = (stt.finalText + " " + stt.interim).trim();
  const timeCritical = remainingSec <= 60;

  if (errorMsg) {
    return (
      <div
        style={{
          minHeight: "100%",
          background: T.bg,
          color: T.paper,
          fontFamily: T.sans,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <AlertCircle size={28} color={T.clayBright} style={{ marginBottom: 16 }} />
          <div style={{ fontFamily: T.serif, fontSize: 20, marginBottom: 10 }}>Couldn't reach the interview backend</div>
          <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.stone, lineHeight: 1.6 }}>{errorMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100%",
        background: T.bg,
        color: T.paper,
        fontFamily: T.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${T.stoneLine}`,
        }}
      >
        <Logo />
        <div style={{ display: "flex", gap: 24, alignItems: "center", fontFamily: T.mono, fontSize: 12 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: timeCritical ? T.clayBright : T.stone,
            }}
          >
            <Clock size={13} /> {elapsedLabel(remainingSec)} left
          </span>
          <span style={{ color: T.stone }}>{config.role} · {config.seniority}</span>
        </div>
      </header>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>
        {/* Transcript / dossier column */}
        <div style={{ overflowY: "auto", padding: "36px 40px", borderRight: `1px solid ${T.stoneLine}` }}>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              color: T.clayBright,
              letterSpacing: 1.5,
              marginBottom: 24,
            }}
          >
            QUESTION {questionIndex + 1} OF {maxQuestions} · DIFFICULTY: {(difficulty || "").toUpperCase()}
          </div>

          <div style={{ borderLeft: `2px solid ${T.stoneLine}`, paddingLeft: 24 }}>
            {transcriptLog.map((entry, i) => (
              <div key={i} style={{ marginBottom: 26, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: -29,
                    top: 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: entry.role === "ai" ? T.sageBright : T.clayBright,
                  }}
                />
                <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.stone, marginBottom: 6 }}>
                  {entry.role === "ai" ? "INTERVIEWER" : "YOU"} · {entry.ts}
                </div>
                <div
                  style={{
                    fontFamily: entry.role === "ai" ? T.serif : T.sans,
                    fontSize: entry.role === "ai" ? 20 : 15,
                    lineHeight: 1.5,
                    color: entry.role === "ai" ? T.paper : T.paperDim,
                    fontStyle: entry.role === "ai" ? "italic" : "normal",
                  }}
                >
                  {entry.text}
                </div>
              </div>
            ))}

            {phase === "listening" && liveTranscript && (
              <div style={{ marginBottom: 26, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: -29,
                    top: 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: T.clay,
                    opacity: 0.5,
                  }}
                />
                <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.stone, marginBottom: 6 }}>
                  YOU · LIVE
                </div>
                <div style={{ fontFamily: T.sans, fontSize: 15, lineHeight: 1.5, color: T.stone }}>
                  {liveTranscript}
                </div>
              </div>
            )}

            {phase === "thinking" && (
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.stone, display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={13} /> Evaluating response…
              </div>
            )}
            {phase === "starting" && (
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.stone }}>Starting session…</div>
            )}
          </div>
        </div>

        {/* Control column */}
        <div style={{ padding: "36px 28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: `1.5px solid ${
                phase === "speaking" ? T.sageBright : phase === "listening" ? T.clayBright : T.stoneLine
              }`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow:
                phase === "speaking"
                  ? "0 0 0 8px rgba(91,122,110,0.08)"
                  : phase === "listening"
                  ? "0 0 0 8px rgba(181,98,62,0.08)"
                  : "none",
              transition: "box-shadow 0.3s",
            }}
          >
            {phase === "speaking" && <Volume2 size={30} color={T.sageBright} />}
            {phase === "listening" && <Mic size={30} color={T.clayBright} />}
            {phase === "thinking" && <Sparkles size={26} color={T.stone} />}
            {phase === "starting" && <Sparkles size={26} color={T.stone} />}
          </div>

          <div
            style={{
              fontFamily: T.mono,
              fontSize: 11.5,
              color: T.stone,
              letterSpacing: 1,
              marginBottom: 28,
              textAlign: "center",
            }}
          >
            {phase === "starting" && "CONNECTING…"}
            {phase === "speaking" && "AI SPEAKING…"}
            {phase === "listening" && "LISTENING"}
            {phase === "thinking" && "PROCESSING…"}
          </div>

          {config.mode === "voice" ? (
            <>
              {!stt.supported && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.clayBright,
                    textAlign: "center",
                    marginBottom: 12,
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  Speech recognition isn't available in this browser. Try Chrome, or switch to text mode.
                </div>
              )}
              <button
                disabled={phase === "speaking" || phase === "thinking" || phase === "starting" || !stt.supported}
                onClick={() => {
                  if (!stt.listening) {
                    stt.start();
                  } else {
                    stt.stop();
                    handleSubmitAnswer((stt.finalText + " " + stt.interim).trim());
                  }
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: stt.listening ? T.clayBright : T.sageBright,
                  color: "#0B0D0F",
                  fontFamily: T.sans,
                  fontWeight: 600,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity:
                    phase === "speaking" || phase === "thinking" || phase === "starting" || !stt.supported
                      ? 0.4
                      : 1,
                }}
              >
                {stt.listening ? (
                  <>
                    <MicOff size={16} /> Stop &amp; Submit
                  </>
                ) : (
                  <>
                    <Mic size={16} /> Start Answering
                  </>
                )}
              </button>
            </>
          ) : (
            <div style={{ width: "100%" }}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={phase !== "listening"}
                placeholder="Type your answer…"
                style={{
                  width: "100%",
                  minHeight: 100,
                  background: T.bgRaised,
                  border: `1px solid ${T.stoneLine}`,
                  borderRadius: 8,
                  color: T.paper,
                  fontFamily: T.sans,
                  fontSize: 14,
                  padding: 12,
                  resize: "vertical",
                  marginBottom: 10,
                }}
              />
              <button
                disabled={phase !== "listening" || !textInput.trim()}
                onClick={() => handleSubmitAnswer(textInput)}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: T.sageBright,
                  color: "#0B0D0F",
                  fontFamily: T.sans,
                  fontWeight: 600,
                  fontSize: 14,
                  opacity: phase !== "listening" || !textInput.trim() ? 0.4 : 1,
                }}
              >
                Submit Answer
              </button>
            </div>
          )}

          <div style={{ width: "100%", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.stoneLine}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.stone, letterSpacing: 1, marginBottom: 10 }}>
              ADAPTIVE DIFFICULTY
            </div>
            <div style={{ height: 6, background: T.stoneLine, borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${difficultyPct}%`,
                  background: T.gold,
                  borderRadius: 3,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontFamily: T.sans,
                fontSize: 10.5,
                color: T.stone,
              }}
            >
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              marginTop: 24,
              fontFamily: T.sans,
              fontSize: 12,
              color: T.stone,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Follow-ups asked</span>
            <span style={{ color: T.paperDim, fontFamily: T.mono }}>{followupCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
