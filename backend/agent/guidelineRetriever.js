const fs = require("fs");
const path = require("path");

const GUIDELINES_PATH = path.join(__dirname, "..", "data", "guidelines", "guidelines.json");

function loadGuidelines() {
  return JSON.parse(fs.readFileSync(GUIDELINES_PATH, "utf-8"));
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Retrieves the top-N most relevant guideline snippets for a query string
 * using simple tag + token overlap scoring. This stands in for a vector
 * similarity search in a lightweight, dependency-free way that is easy to
 * demo and reason about.
 */
function retrieveGuidelines(queryText, topN = 3) {
  const guidelines = loadGuidelines();
  const queryTokens = new Set(tokenize(queryText));

  const scored = guidelines.map((g) => {
    let score = 0;
    for (const tag of g.tags) {
      if (queryTokens.has(tag) || [...queryTokens].some((t) => tag.includes(t) || t.includes(tag))) {
        score += 2;
      }
    }
    const bodyTokens = new Set(tokenize(g.title + " " + g.text));
    for (const t of queryTokens) {
      if (bodyTokens.has(t)) score += 0.5;
    }
    return { ...g, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((g) => g.score > 0)
    .slice(0, topN);
}

module.exports = { retrieveGuidelines, loadGuidelines };
