import { useState, useRef, useEffect, useCallback } from "react";
import { fetchTtsAudioUrl } from "./api.js";

/**
 * Speak text using the backend's Rime proxy. Falls back to the browser's
 * built-in speechSynthesis if Rime isn't configured server-side or the
 * request fails for any reason — so the demo never goes silent.
 */
export async function speak(text, { onStart, onEnd } = {}) {
  try {
    const url = await fetchTtsAudioUrl(text);
    const audio = new Audio(url);
    audio.onplay = () => onStart && onStart();
    audio.onended = () => {
      onEnd && onEnd();
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      onEnd && onEnd();
      URL.revokeObjectURL(url);
    };
    await audio.play();
    return;
  } catch (err) {
    // Fall back to browser TTS
    speakWithBrowser(text, onStart, onEnd);
  }
}

function speakWithBrowser(text, onStart, onEnd) {
  if (!("speechSynthesis" in window)) {
    onEnd && onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.98;
  utter.pitch = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en-US|en-GB/.test(v.lang) && /Male|Google/.test(v.name)) ||
    voices.find((v) => /en/.test(v.lang));
  if (preferred) utter.voice = preferred;
  utter.onstart = () => onStart && onStart();
  utter.onend = () => onEnd && onEnd();
  utter.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(utter);
}

/**
 * Browser speech-to-text (Web Speech API). SWAP POINT: for a production
 * deployment, replace this with a hosted streaming STT provider (e.g.
 * Deepgram, AssemblyAI) — the browser API is Chrome-only and not always
 * reliable, but it needs zero extra credentials for a working prototype.
 */
export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [supported, setSupported] = useState(true);
  const recogRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";
    recog.onresult = (e) => {
      let interimStr = "";
      let finalStr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalStr += t + " ";
        else interimStr += t;
      }
      if (finalStr) setFinalText((prev) => prev + finalStr);
      setInterim(interimStr);
    };
    recog.onend = () => setListening(false);
    recog.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "not-allowed") {
        alert("Microphone access was denied. Please allow microphone permissions in your browser settings and try again.");
      }
      setListening(false);
    };
    recogRef.current = recog;
    return () => {
      try {
        recog.stop();
      } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recogRef.current) return;
    setFinalText("");
    setInterim("");
    try {
      recogRef.current.start();
      setListening(true);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    if (!recogRef.current) return;
    try {
      recogRef.current.stop();
    } catch {}
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
  }, []);

  return { listening, interim, finalText, start, stop, reset, supported };
}
