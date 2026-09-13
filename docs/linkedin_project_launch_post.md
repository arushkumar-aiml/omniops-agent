🩺 Introducing OmniOps Health — our submission for Tech Zephyr 4.0, Agentic AI Hackathon @
IIT Bhubaneswar (Problem Statement 1: Autonomous Clinical Documentation & Follow-up Agent).

Most "AI for healthcare" demos generate one response and stop. We wanted to build something
that behaves like an actual agent — so OmniOps Health runs a full autonomous loop on every
patient encounter:

🎯 Goal — decide what a safe follow-up record needs to contain
⚙️ Action — ingest the encounter, reconcile it against the patient's record
🔍 Retrieve — pull the relevant clinical guideline excerpts (lightweight RAG)
✍️ Draft — generate a structured follow-up plan with NVIDIA Nemotron
🧭 Validate & Decide — check the draft against safety rules (allergy conflicts, renal risk,
   missing red-flag education) and either approve it or escalate to a human clinician
🔄 Adapt — when new information lands mid-session (a lab result, a symptom change), the
   agent re-plans on the spot instead of working off a stale draft
✅ Outcome — a structured, traceable follow-up record, end to end

The one rule we didn't let ourselves break: if the agent's own draft conflicts with a
patient's documented allergy, it is never auto-approved — it always goes to a human.

Built as a real full-stack system: React + Node/Express backend, NVIDIA Nemotron for the
reasoning layer (with a graceful offline fallback so it still runs without a live key), and
a standalone Python CLI implementing the same agent loop.

Huge thanks to Tech Zephyr 4.0 and IIT Bhubaneswar for a genuinely fun problem to dig into.

Team Mavericks:
🧠 Arush Kumar — Team Lead
⚙️ Aniket Gautam
🔍 Abhay Shukla
🎨 Adeel Ahmad

Demo + code walkthrough in the comments. Would love feedback from anyone building in
health-tech or agentic systems! 🩺⚡

#TechZephyr4 #AgenticAI #NVIDIA #HealthTech #IITBhubaneswar #TeamMavericks #Hackathon
