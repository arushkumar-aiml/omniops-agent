const express = require("express");
const fs = require("fs");
const path = require("path");
const { runSession, applyUpdate } = require("../agent/orchestrator");
const { getSession } = require("../agent/memory");

const router = express.Router();
const PATIENTS_PATH = path.join(__dirname, "..", "data", "patients.json");

function loadPatients() {
  return JSON.parse(fs.readFileSync(PATIENTS_PATH, "utf-8"));
}

// GET /api/agent/patients — synthetic patient list the demo/UI can pick from
router.get("/patients", (req, res) => {
  res.json({ patients: loadPatients() });
});

// POST /api/agent/session  { patientId, encounterNotes }
router.post("/session", async (req, res) => {
  const { patientId, encounterNotes } = req.body;
  if (!patientId || !encounterNotes) {
    return res.status(400).json({ error: "patientId and encounterNotes are required." });
  }

  const patient = loadPatients().find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: `No patient found with id ${patientId}` });
  }

  try {
    const session = await runSession({ patient, encounterNotes });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Agent session failed", detail: err.message });
  }
});

// GET /api/agent/session/:id
router.get("/session/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// POST /api/agent/session/:id/update  { note }
router.post("/session/:id/update", async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: "note is required." });

  try {
    const session = await applyUpdate({ sessionId: req.params.id, updateNote: note });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Agent update failed", detail: err.message });
  }
});

module.exports = router;
