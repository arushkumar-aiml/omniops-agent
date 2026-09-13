# OmniOps Health — Demo Video Script

Target length: ~3 minutes. Maps every beat to the required
Goal → Action → Observation → Decision → Adaptation → Outcome flow so judges can see the
agentic loop directly on screen.

---

**[0:00–0:15] Cold open — the problem**
Screen: title card "OmniOps Health — Autonomous Clinical Documentation & Follow-up Agent."
Voiceover: "Clinicians spend hours a day writing follow-up notes. Most AI tools just generate
one paragraph and stop. We built an agent that actually plans, checks itself, and knows when
to ask a human for help."

**[0:15–0:30] Team & context**
Screen: Team Mavericks slide — Arush Kumar (Lead), Aniket Gautam, Abhay Shukla, Adeel Ahmad.
Voiceover: "This is Team Mavericks, for Tech Zephyr 4.0 at IIT Bhubaneswar, Problem Statement
1: Autonomous Clinical Documentation & Follow-up Agent."

**[0:30–0:50] App tour**
Screen: open the app, show the two tabs — "Clinical Documentation Agent" and "Medication
Guide." Briefly hover the medication guide tab to show it's still there, then click into the
agent tab.
Voiceover: "The core of the submission is the Clinical Documentation Agent tab — this is
where the full agent loop runs."

**[0:50–1:10] Pick a case — Goal**
Screen: select patient Fatima Khan (P-1003, pediatric, documented amoxicillin allergy).
Encounter notes are pre-filled: "Sore throat, difficulty swallowing, low-grade fever for 2
days." Click "Run agent on this encounter." Point at the first trace entry.
Voiceover: "We pick a synthetic patient — a 9-year-old with a documented amoxicillin allergy
— and run the agent. First it sets its Goal: produce a safe, guideline-grounded follow-up
record, escalating if it can't be auto-approved."

**[1:10–1:40] Action / Observation — ingest, retrieve, draft**
Screen: scroll through the trace as it appears — ingest & reconcile, guideline retrieval
(highlight the retrieved guideline chips, e.g. G-03 Pediatric Sore Throat Management), then
the Nemotron draft step.
Voiceover: "It reconciles the encounter with the stored patient record, retrieves the most
relevant clinical guideline excerpts, then drafts a follow-up plan using NVIDIA Nemotron —
grounded only in what it retrieved, not free-floating guesses."

**[1:40–2:05] Decision — the safety catch**
Screen: scroll to the Decision entry — highlight the "critical: allergy_conflict" finding and
the status pill flipping to "Escalated to clinician."
Voiceover: "Here's the part we care about most: the draft mentions a penicillin-class
antibiotic — but this patient is allergic to amoxicillin. The validator catches that
automatically and the agent refuses to auto-approve. It escalates to a human clinician
instead of guessing."

**[2:05–2:35] Adaptation — mid-session update**
Screen: type into the "Inject a mid-session update" box: "Rapid strep test came back
positive." Submit. Watch the new Adaptation trace entry appear, followed by re-retrieval,
a revised draft, and a new Decision.
Voiceover: "Now we simulate new information arriving mid-session — a positive strep test.
The agent doesn't just tack this onto the old plan. It re-plans: re-retrieves guidelines,
redrafts, and re-validates — and because the allergy conflict is still there, it correctly
escalates again. That's autonomous adaptation, not a scripted reply."

**[2:35–2:50] Outcome + second tool**
Screen: show the final structured follow-up record card (status pill, guideline chips, plan
text). Quick cut to the Medication Guide tab showing a prescription lookup.
Voiceover: "Every session ends in a structured, traceable follow-up record. We also kept our
original Medication Guide tool in a second tab, for patient-facing plain-language medicine
explanations."

**[2:50–3:00] Close**
Screen: GitHub repo / team slide.
Voiceover: "OmniOps Health — Team Mavericks, Tech Zephyr 4.0. Thanks for watching."

---

## Filming notes

- Record the agent tab first with NO `NVIDIA_API_KEY` set, to guarantee deterministic,
  repeatable output for the escalation moment (offline-fallback mode is designed to still
  demonstrate the full loop).
- Optionally record a second short clip with a live `NVIDIA_API_KEY` configured to show the
  richer Nemotron-generated narrative plan, and mention "source: nvidia/llama-3.1-nemotron"
  visible in the record card.
- Zoom/crop to the trace timeline while it's populating — the step icons (🎯⚙️👁️🧭🔄✅) read
  well even at reduced video resolution.
