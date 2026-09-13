const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DATA_PATH = path.join(__dirname, "..", "data", "medicines.json");

function loadMedicines() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function normalize(str) {
  return str.trim().toLowerCase();
}

/**
 * Matches a free-text medicine name against the knowledge base using
 * alias lookup + loose substring matching (handles brand names, partial
 * names, and minor typos in casing/spacing).
 */
function matchMedicine(query, medicines) {
  const q = normalize(query);
  if (!q) return null;

  // Exact alias match first
  let hit = medicines.find((m) => m.aliases.some((a) => normalize(a) === q));
  if (hit) return hit;

  // Substring match (either direction) as a fallback
  hit = medicines.find((m) =>
    m.aliases.some((a) => normalize(a).includes(q) || q.includes(normalize(a)))
  );
  return hit || null;
}

// POST /api/prescription/analyze
// body: { medicines: ["Dolo 650", "Amoxyclav", "Vitamin D3"] }
router.post("/analyze", (req, res) => {
  const { medicines: inputList } = req.body;

  if (!Array.isArray(inputList) || inputList.length === 0) {
    return res.status(400).json({
      error: "Please provide a non-empty 'medicines' array of names from the prescription.",
    });
  }

  const knowledgeBase = loadMedicines();
  const results = [];
  const notFound = [];

  for (const rawName of inputList) {
    const match = matchMedicine(rawName, knowledgeBase);
    if (match) {
      results.push({ queried_as: rawName, ...match });
    } else {
      notFound.push(rawName);
    }
  }

  // Merge combined lifestyle guidance across all matched medicines
  const combinedAvoidDrinks = [...new Set(results.flatMap((m) => m.avoidDrinks))];
  const combinedLifestyleTips = [...new Set(results.flatMap((m) => m.lifestyleTips))];

  res.json({
    summary: {
      total_queried: inputList.length,
      matched: results.length,
      unmatched: notFound.length,
    },
    medicines: results,
    unmatched_names: notFound,
    combined_guidance: {
      avoid_drinks_overall: combinedAvoidDrinks,
      lifestyle_tips_overall: combinedLifestyleTips,
    },
    disclaimer:
      "This information is for general educational awareness only, generated from a demo knowledge base. " +
      "It is not a substitute for professional medical advice. Always follow your doctor's exact prescription " +
      "and consult them (or a pharmacist) before making any changes to diet, dosage, or routine.",
  });
});

// GET /api/prescription/medicines — list everything in the demo knowledge base
router.get("/medicines", (req, res) => {
  const knowledgeBase = loadMedicines();
  res.json({
    count: knowledgeBase.length,
    medicines: knowledgeBase.map((m) => ({ id: m.id, name: m.name, category: m.category })),
  });
});

module.exports = router;
