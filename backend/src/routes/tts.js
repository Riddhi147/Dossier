import { Router } from "express";
import { synthesizeSpeech, rimeEnabled } from "../lib/rime.js";

const router = Router();

// POST /api/tts  { text, speaker? }
router.post("/", async (req, res) => {
  if (!rimeEnabled) {
    return res.status(501).json({ error: "Rime not configured (missing RIME_API_KEY)" });
  }

  try {
    const { text, speaker } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const { buffer, contentType } = await synthesizeSpeech(text, { speaker });
    res.set("Content-Type", contentType);
    res.send(buffer);
  } catch (err) {
    console.error("[POST /api/tts]", err);
    res.status(500).json({ error: "TTS synthesis failed", detail: String(err.message || err) });
  }
});

export default router;
