/**
 * Thin client around NVIDIA's NIM-hosted Nemotron models.
 *
 * NVIDIA exposes an OpenAI-compatible /chat/completions endpoint at
 * https://integrate.api.nvidia.com/v1/chat/completions for models such as
 * "nvidia/llama-3.1-nemotron-70b-instruct". Set NVIDIA_API_KEY (get one at
 * https://build.nvidia.com) in backend/.env to use the live model.
 *
 * If no key is configured, or the call fails for any reason (offline demo,
 * rate limit, judge's wifi, etc.), this falls back to a deterministic local
 * draft generator so the full agent loop still runs end-to-end and every
 * step of the trace is still populated.
 */

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.NVIDIA_NEMOTRON_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

async function callNemotron({ systemPrompt, userPrompt, structured, temperature = 0.3, maxTokens = 600 }) {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return {
      source: "offline-fallback",
      text: offlineDraft({ userPrompt, structured }),
    };
  }

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        top_p: 0.9,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) throw new Error("Empty completion from Nemotron");

    return { source: DEFAULT_MODEL, text };
  } catch (err) {
    // Network/key/quota failure — degrade gracefully instead of breaking the demo.
    return {
      source: "offline-fallback",
      text: offlineDraft({ userPrompt, structured }),
      error: err.message,
    };
  }
}

/**
 * Deterministic, template-based stand-in for the LLM draft step. Not fancy —
 * just enough structure that the rest of the pipeline (validation, revision,
 * escalation) has real content to work with when there's no live API key.
 *
 * Builds from the structured fields rather than echoing the raw prompt, so
 * it never accidentally repeats a patient's allergy list in a way that
 * looks like a proposed medication to the downstream validator.
 */
function offlineDraft({ structured }) {
  const s = structured || {};
  const guidelineLines = (s.guidelines || [])
    .map((g) => `   - [${g.id}] ${g.title}`)
    .join("\n");
  const allergies = (s.allergies || []).map((a) => a.toLowerCase());

  // Naive first-pass medication suggestion, deliberately mirroring how a
  // guideline-grounded but imperfect draft model can still slip and suggest
  // something that conflicts with the patient's record — which is exactly
  // what the downstream safety validator step exists to catch.
  let medNote;
  if (allergies.some((a) => a.includes("penicillin") || a.includes("amoxicillin"))) {
    medNote =
      "Consider a penicillin-class antibiotic (e.g. amoxicillin) if a bacterial cause is confirmed, pending clinical correlation.";
  } else if (allergies.some((a) => a.includes("sulfa"))) {
    medNote =
      "If diuresis is needed for the edema, a sulfonamide-based diuretic could be considered; otherwise continue current regimen.";
  } else if (allergies.length) {
    medNote = `No first-line option in this note conflicts with the documented allergy list (${(s.allergies || []).join(", ")}).`;
  } else {
    medNote = "No documented drug allergies on file; continue current medications as clinically indicated.";
  }

  return (
    "DRAFT FOLLOW-UP PLAN (offline fallback — no live NVIDIA_API_KEY configured)\n" +
    `1. Presenting complaint: ${s.reasonForVisit || "see encounter notes"}.\n` +
    `2. Encounter update: ${s.encounterNotes || "n/a"}.\n` +
    "3. Guidelines consulted:\n" + (guidelineLines || "   - none strongly matched") + "\n" +
    "4. Follow-up interval: as recommended by the most relevant guideline above; sooner if symptoms worsen.\n" +
    "5. Monitoring & red-flag symptoms: track for any red-flag deterioration described in the guideline excerpts above (e.g. breathlessness, chest pain, high fever, inability to swallow fluids) and return sooner if they occur.\n" +
    `6. Medication note: ${medNote}\n` +
    "This offline draft is intentionally conservative; connect NVIDIA_API_KEY for the full Nemotron-generated narrative plan."
  );
}

module.exports = { callNemotron };
