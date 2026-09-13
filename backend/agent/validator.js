/**
 * Validates a drafted follow-up plan against structured patient safety data.
 * This is what lets the agent catch its own mistakes (or the LLM's) instead
 * of blindly trusting the draft — the core "self-check" loop of the system.
 */
function validatePlan({ patient, draftText, retrievedGuidelines }) {
  const issues = [];
  const lowerDraft = draftText.toLowerCase();

  // Rule 1: allergy conflict — does the draft mention a medication class the
  // patient is documented as allergic to?
  for (const allergy of patient.allergies) {
    const a = allergy.toLowerCase();
    const mentioned =
      lowerDraft.includes(a) ||
      (a.includes("penicillin") && (lowerDraft.includes("amoxicillin") || lowerDraft.includes("amoxyclav"))) ||
      (a.includes("amoxicillin") && lowerDraft.includes("amoxicillin")) ||
      (a.includes("sulfa") && lowerDraft.includes("sulfonamide"));
    if (mentioned) {
      issues.push({
        severity: "critical",
        rule: "allergy_conflict",
        message: `Draft references a medication that conflicts with documented allergy: ${allergy}.`,
      });
    }
  }

  // Rule 2: CKD + nephrotoxic / metformin contraindication awareness
  if (
    patient.chronicConditions.some((c) => c.toLowerCase().includes("kidney")) &&
    lowerDraft.includes("nsaid")
  ) {
    issues.push({
      severity: "high",
      rule: "renal_risk",
      message: "NSAID mentioned for a patient with chronic kidney disease — needs explicit renal-safety caveat.",
    });
  }

  // Rule 3: cardiac red-flag omission
  const isCardiacCase = retrievedGuidelines.some((g) => g.id === "G-02");
  if (isCardiacCase && !lowerDraft.includes("emergency") && !lowerDraft.includes("red-flag") && !lowerDraft.includes("red flag")) {
    issues.push({
      severity: "high",
      rule: "missing_redflag_education",
      message: "Cardiac follow-up draft does not explicitly list emergency red-flag symptoms.",
    });
  }

  // Rule 4: pediatric case missing caregiver confirmation
  if (patient.age < 18 && !lowerDraft.includes("caregiver") && !lowerDraft.includes("parent")) {
    issues.push({
      severity: "medium",
      rule: "pediatric_caregiver_check",
      message: "Pediatric plan does not mention confirming history with a caregiver.",
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;

  return {
    passed: issues.length === 0,
    requiresHumanEscalation: criticalCount > 0,
    issues,
  };
}

module.exports = { validatePlan };
