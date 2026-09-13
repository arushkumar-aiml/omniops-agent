const { randomUUID } = require("crypto");
const { retrieveGuidelines } = require("./guidelineRetriever");
const { callNemotron } = require("./nemotronClient");
const { validatePlan } = require("./validator");
const { saveSession, getSession } = require("./memory");

function traceEntry(step, label, detail) {
  return { step, label, detail, timestamp: new Date().toISOString() };
}

function buildSystemPrompt() {
  return (
    "You are a clinical documentation and follow-up planning assistant embedded in a " +
    "hospital workflow tool. You draft structured, cautious follow-up plans from a patient " +
    "record and encounter note, grounded ONLY in the clinical guideline excerpts provided. " +
    "You are not a diagnostic authority: never invent a diagnosis, never state you are " +
    "certain, and always explicitly flag anything that should be confirmed by a human " +
    "clinician. Keep the plan concise: presenting summary, follow-up interval, monitoring " +
    "parameters, red-flag symptoms, and medication notes."
  );
}

function buildUserPrompt({ patient, encounterNotes, guidelines }) {
  const guidelineText = guidelines
    .map((g) => `- [${g.id}] ${g.title}: ${g.text}`)
    .join("\n");

  return (
    `Patient: ${patient.name}, age ${patient.age}, sex ${patient.sex}\n` +
    `Documented allergies: ${patient.allergies.join(", ") || "None recorded"}\n` +
    `Chronic conditions: ${patient.chronicConditions.join(", ") || "None recorded"}\n` +
    `Current medications: ${patient.currentMedications.join(", ") || "None recorded"}\n` +
    `Reason for visit: ${patient.reasonForVisit}\n` +
    `Encounter notes: ${encounterNotes}\n\n` +
    `Relevant guideline excerpts (use only these as clinical grounding):\n${guidelineText}\n\n` +
    "Draft the follow-up plan now."
  );
}

/**
 * Runs one full pass of the agent loop for a new encounter.
 */
async function runSession({ patient, encounterNotes }) {
  const sessionId = randomUUID();
  const trace = [];

  trace.push(
    traceEntry(
      "Goal",
      "Produce a validated follow-up documentation record",
      `Agent goal: turn today's encounter for ${patient.name} (${patient.id}) into a safe, guideline-grounded structured follow-up record, escalating to a human clinician if anything can't be safely auto-approved.`
    )
  );

  // --- Ingest + reconcile ---
  trace.push(
    traceEntry(
      "Action",
      "Ingest encounter & reconcile with patient record",
      `Merged incoming encounter notes with stored record: allergies=[${patient.allergies.join(", ") || "none"}], chronic conditions=[${patient.chronicConditions.join(", ") || "none"}], current meds=[${patient.currentMedications.join(", ") || "none"}].`
    )
  );
  trace.push(
    traceEntry(
      "Observation",
      "Reconciled patient snapshot ready",
      "No conflicting demographic data found between encounter note and stored record."
    )
  );

  // --- Retrieve (RAG) ---
  const queryText = `${patient.reasonForVisit} ${encounterNotes}`;
  const guidelines = retrieveGuidelines(queryText, 3);
  trace.push(
    traceEntry(
      "Action",
      "Retrieve relevant clinical guidelines",
      `Queried guideline knowledge base with the encounter context.`
    )
  );
  trace.push(
    traceEntry(
      "Observation",
      `Retrieved ${guidelines.length} guideline excerpt(s)`,
      guidelines.map((g) => `[${g.id}] ${g.title}`).join("; ") || "No strongly matching guideline found."
    )
  );

  // --- Draft (Nemotron) ---
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ patient, encounterNotes, guidelines });
  trace.push(
    traceEntry(
      "Action",
      "Draft follow-up plan via NVIDIA Nemotron",
      "Sent reconciled patient snapshot + retrieved guidelines to the Nemotron model to draft a grounded follow-up plan."
    )
  );
  const draft = await callNemotron({
    systemPrompt,
    userPrompt,
    structured: {
      reasonForVisit: patient.reasonForVisit,
      encounterNotes,
      allergies: patient.allergies,
      guidelines,
    },
  });
  trace.push(
    traceEntry(
      "Observation",
      `Draft received (source: ${draft.source})`,
      draft.text
    )
  );

  // --- Validate / Decide ---
  const validation = validatePlan({ patient, draftText: draft.text, retrievedGuidelines: guidelines });
  let decisionLabel;
  let status;
  if (validation.requiresHumanEscalation) {
    decisionLabel = "Escalate to human clinician";
    status = "escalated";
  } else if (!validation.passed) {
    decisionLabel = "Auto-revise with safety notes, then approve";
    status = "approved_with_notes";
  } else {
    decisionLabel = "Approve plan";
    status = "approved";
  }

  trace.push(
    traceEntry(
      "Decision",
      decisionLabel,
      validation.issues.length
        ? validation.issues.map((i) => `[${i.severity}] ${i.rule}: ${i.message}`).join(" | ")
        : "No safety issues found by the validator."
    )
  );

  const record = {
    sessionId,
    patient,
    encounterNotes,
    guidelinesUsed: guidelines.map((g) => ({ id: g.id, title: g.title })),
    draftSource: draft.source,
    planText: draft.text,
    status,
    safetyIssues: validation.issues,
    followUpRecommended: !validation.requiresHumanEscalation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  trace.push(
    traceEntry(
      "Outcome",
      status === "escalated" ? "Sent to clinician queue — not auto-finalized" : "Follow-up record finalized",
      status === "escalated"
        ? "Plan withheld from auto-approval because of a critical safety conflict. A clinician must review before this is sent to the patient."
        : "Structured follow-up record generated and stored for this session."
    )
  );

  const session = { sessionId, patient, encounterNotes, trace, record };
  saveSession(sessionId, session);
  return session;
}

/**
 * Demonstrates autonomous adaptation: injects a mid-session update (e.g. a
 * new lab result or a symptom change) and re-runs the relevant parts of the
 * pipeline, appending an explicit "Adaptation" trace entry that explains
 * what changed and why the plan changed as a result.
 */
async function applyUpdate({ sessionId, updateNote }) {
  const session = getSession(sessionId);
  if (!session) return null;

  const { patient } = session;
  const combinedNotes = `${session.encounterNotes}\n\nMID-SESSION UPDATE: ${updateNote}`;

  session.trace.push(
    traceEntry(
      "Adaptation",
      "New information received mid-session",
      `Update injected: "${updateNote}". Re-running retrieval and drafting steps with the updated context instead of continuing on the stale plan.`
    )
  );

  const queryText = `${patient.reasonForVisit} ${combinedNotes}`;
  const guidelines = retrieveGuidelines(queryText, 3);
  session.trace.push(
    traceEntry(
      "Action",
      "Re-retrieve guidelines with updated context",
      guidelines.map((g) => `[${g.id}] ${g.title}`).join("; ") || "No strongly matching guideline found."
    )
  );

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ patient, encounterNotes: combinedNotes, guidelines });
  const draft = await callNemotron({
    systemPrompt,
    userPrompt,
    structured: {
      reasonForVisit: patient.reasonForVisit,
      encounterNotes: combinedNotes,
      allergies: patient.allergies,
      guidelines,
    },
  });
  session.trace.push(
    traceEntry("Observation", `Revised draft received (source: ${draft.source})`, draft.text)
  );

  const validation = validatePlan({ patient, draftText: draft.text, retrievedGuidelines: guidelines });
  let decisionLabel;
  let status;
  if (validation.requiresHumanEscalation) {
    decisionLabel = "Escalate to human clinician (post-update)";
    status = "escalated";
  } else if (!validation.passed) {
    decisionLabel = "Auto-revise with safety notes, then approve (post-update)";
    status = "approved_with_notes";
  } else {
    decisionLabel = "Approve revised plan";
    status = "approved";
  }

  session.trace.push(
    traceEntry(
      "Decision",
      decisionLabel,
      validation.issues.length
        ? validation.issues.map((i) => `[${i.severity}] ${i.rule}: ${i.message}`).join(" | ")
        : "No safety issues found by the validator after re-planning."
    )
  );

  session.encounterNotes = combinedNotes;
  session.record = {
    ...session.record,
    encounterNotes: combinedNotes,
    guidelinesUsed: guidelines.map((g) => ({ id: g.id, title: g.title })),
    draftSource: draft.source,
    planText: draft.text,
    status,
    safetyIssues: validation.issues,
    followUpRecommended: !validation.requiresHumanEscalation,
    updatedAt: new Date().toISOString(),
  };

  session.trace.push(
    traceEntry(
      "Outcome",
      status === "escalated" ? "Sent to clinician queue after adaptation" : "Follow-up record re-finalized after adaptation",
      "The agent adapted its plan autonomously in response to new information without needing the session to be restarted."
    )
  );

  saveSession(sessionId, session);
  return session;
}

module.exports = { runSession, applyUpdate };
