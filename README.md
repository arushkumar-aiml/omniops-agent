# 🩺 OmniOps Health

**An autonomous Clinical Documentation & Follow-up Agent.**

Tech Zephyr 4.0 · Agentic AI Hackathon · IIT Bhubaneswar
**Team Mavericks** — Arush Kumar (Lead), Aniket Gautam, Abhay Shukla, Adeel Ahmad

Problem Statement 1: *Autonomous Clinical Documentation & Follow-up Agent* — an agent that
takes a doctor's encounter notes, reconciles them against a patient's record, grounds itself
in clinical guidelines, drafts a follow-up plan with an LLM, checks its own draft for safety
conflicts, and either approves it or escalates to a human clinician — then can **adapt mid
session** the moment new information arrives (a lab result, a symptom change), without a
restart.

---

## Why this is agentic, not just a chatbot

The system doesn't just answer a question once. For every encounter it runs a real loop, and
every step is shown live in the UI and logged in both the backend and the CLI:

```
🎯 Goal          →  what the agent is trying to accomplish this session
⚙️  Action        →  ingest, reconcile, retrieve, draft
👁️  Observation   →  what it got back at each step
🧭 Decision       →  approve / approve-with-notes / escalate to a human
🔄 Adaptation     →  re-plans autonomously when new info is injected mid-session
✅ Outcome        →  the finalized (or escalated) structured follow-up record
```

The **safety validator** is the important part: the model's draft is never trusted blindly.
It's checked against structured patient data (documented allergies, chronic conditions, age)
using explicit rules — e.g. an allergy conflict is always routed to a human, never
auto-approved — which is exactly the kind of tool-using, self-checking, goal-directed
behaviour the hackathon's agentic principle asks for, not a single good response.

## Architecture

```
omniops-health/
├── backend/                     # Node/Express API — the agent's "brain" + tools
│   ├── agent/
│   │   ├── orchestrator.js        # Goal→Action→Observation→Decision→Adaptation→Outcome loop
│   │   ├── nemotronClient.js      # NVIDIA NIM (Nemotron) client + offline fallback
│   │   ├── guidelineRetriever.js  # Lightweight RAG over the guideline corpus
│   │   ├── validator.js           # Safety rule checks on the drafted plan
│   │   └── memory.js              # In-memory session store
│   ├── data/
│   │   ├── patients.json          # Synthetic patient records (agent's "environment" state)
│   │   └── guidelines/guidelines.json  # Clinical guideline corpus (RAG source)
│   ├── routes/
│   │   ├── agent.js                # /api/agent/* — the agentic endpoints
│   │   └── prescription.js         # /api/prescription/* — original medication-guide tool
│   └── server.js
├── frontend/                    # React (Vite) UI
│   └── src/
│       ├── components/
│       │   ├── AgentPanel.jsx      # Patient picker, run session, inject updates
│       │   ├── AgentTrace.jsx      # Live Goal→…→Outcome timeline
│       │   ├── FollowUpRecord.jsx  # Structured output + safety findings
│       │   └── PrescriptionForm.jsx / MedicineCard.jsx / Header.jsx  (original tool)
│       ├── App.jsx                 # Tabs: Clinical Documentation Agent | Medication Guide
│       └── index.css
├── agent-cli/                   # Standalone Python re-implementation of the same agent loop
│   ├── clinical_agent.py
│   ├── requirements.txt
│   └── data/ (shared patients.json + guidelines.json)
└── docs/
    ├── linkedin_pre_project_announcement.md
    ├── linkedin_project_launch_post.md
    └── demo_video_script.md
```

## Running it locally

### 1. Backend (Node/Express + NVIDIA Nemotron)

```bash
cd backend
npm install
cp .env.example .env
# optional: add your NVIDIA_API_KEY from https://build.nvidia.com to .env
npm start
# → 🩺 OmniOps Health API running on http://localhost:5000
```

Without an `NVIDIA_API_KEY`, the agent automatically runs in **offline deterministic-fallback
mode** — the full Goal→…→Outcome loop still runs end-to-end (including validation and
escalation) so the demo works with no internet or key. Add the key to see live
Nemotron-generated narrative plans instead of the template draft.

### 2. Frontend (React/Vite)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → open http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend on port 5000, so run both side by side.

### 3. Python CLI (standalone, no server needed)

```bash
cd agent-cli
pip install -r requirements.txt
cp .env.example .env   # optional: add NVIDIA_API_KEY here too
python clinical_agent.py                                  # run all sample patients
python clinical_agent.py --patient P-1003                 # one patient
python clinical_agent.py --patient P-1003 --update "Rapid strep test came back positive."
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/agent/patients` | List the synthetic patient records the agent can run on |
| `POST /api/agent/session` | `{ patientId, encounterNotes }` → runs the full agent loop, returns `{ sessionId, trace, record }` |
| `POST /api/agent/session/:id/update` | `{ note }` → injects new information mid-session, triggers the **Adaptation** step, returns the updated trace + record |
| `GET /api/agent/session/:id` | Fetch a session's current state |
| `POST /api/prescription/analyze` | Original medication-guide tool: `{ medicines: [...] }` |
| `GET /api/health` | Liveness check; also reports whether `NVIDIA_API_KEY` is configured |

## The agentic loop, in detail

1. **Ingest & reconcile** — merges the day's encounter notes with the stored patient record
   (allergies, chronic conditions, current medications).
2. **Retrieve (RAG)** — scores a small clinical guideline corpus against the encounter
   context and pulls the top matching excerpts, so the draft is grounded in something
   concrete rather than the model's unaided judgment.
3. **Draft (NVIDIA Nemotron)** — the reconciled patient snapshot + retrieved guidelines are
   sent to the Nemotron model (`nvidia/llama-3.1-nemotron-70b-instruct` via NVIDIA NIM) to
   draft a structured follow-up plan.
4. **Validate** — the draft is checked against explicit safety rules: allergy conflicts,
   renal-risk medication mentions for CKD patients, missing red-flag education for cardiac
   cases, missing caregiver confirmation for pediatric cases.
5. **Decide** — approve / approve-with-safety-notes / **escalate to a human clinician**.
   Anything with a critical conflict (e.g. a proposed medication matching a documented
   allergy) is never auto-finalized.
6. **Adapt** — if new information arrives mid-session (a lab result, a changed symptom), the
   agent re-runs retrieval and drafting on the updated context and re-decides, logging an
   explicit **Adaptation** trace entry — it doesn't just append the new note to a stale plan.
7. **Outcome** — a structured follow-up record is stored and returned, with full traceability
   back through every step that produced it.

## Design notes (UI)

- Palette: pine green + warm ivory + amber accent, extended with status colors (approved /
  approved-with-notes / escalated) for the agent trace and follow-up record.
- Typography: Fraunces (serif) for headings, Work Sans for body text — unchanged from the
  original Medication Guide tool for a consistent brand.
- The trace timeline and the sticky follow-up-record card sit side by side so a judge can
  watch the agent think on the left while seeing the resulting document build on the right.

## Data & safety

- `backend/data/patients.json` — 4 fully synthetic patients (no real patient data).
- `backend/data/guidelines/guidelines.json` — a small illustrative guideline corpus written
  for this demo; **not** a substitute for a real clinical decision-support knowledge base.
- Every response carries a disclaimer: this is a hackathon prototype, not a certified
  clinical tool, and every escalated or note-flagged plan requires a licensed clinician's
  sign-off before use.

## Roadmap

- Round 1 (now): full agent loop (ingest → retrieve → draft → validate → decide → adapt →
  outcome) across Node backend, React frontend, and a standalone Python CLI; NVIDIA Nemotron
  integration with offline fallback; original Medication Guide tool kept as a second tab.
- Round 2: real EHR/FHIR ingestion, a verified clinical guideline vector store, multi-turn
  clinician review/approval workflow, audit logging.
- Beyond: multi-language support, voice-note encounter capture, pharmacist-in-the-loop
  verification for the Medication Guide tool.

## Disclaimer

OmniOps Health is a hackathon prototype for general educational and demonstration purposes
only. It is **not** a certified medical device, does not provide diagnoses, and does not
replace a doctor's or pharmacist's judgment. All patient data in this repository is
synthetic.
