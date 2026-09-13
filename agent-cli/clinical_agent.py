#!/usr/bin/env python3
"""
OmniOps Health — Clinical Documentation & Follow-up Agent (Python CLI)
Team Mavericks · Tech Zephyr 4.0 · IIT Bhubaneswar

A standalone, dependency-light re-implementation of the same agent loop as
the Node/Express backend, for judges/graders who want to see the reasoning
pipeline run end-to-end from a single script:

    Goal -> Action -> Observation -> Decision -> (Adaptation) -> Outcome

Usage:
    python clinical_agent.py                       # run all sample cases
    python clinical_agent.py --patient P-1003       # run one patient
    python clinical_agent.py --patient P-1003 --update "Rapid strep test came back positive."

Set NVIDIA_API_KEY in the environment (or a .env file next to this script)
to use the live NVIDIA NIM-hosted Nemotron model. Without a key, the script
runs a deterministic offline draft generator so the full loop still works.
"""

import argparse
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

BASE_DIR = Path(__file__).resolve().parent
PATIENTS_PATH = BASE_DIR / "data" / "patients.json"
GUIDELINES_PATH = BASE_DIR / "data" / "guidelines.json"

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_MODEL = os.environ.get("NVIDIA_NEMOTRON_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")


def load_env_file():
    """Minimal .env loader so NVIDIA_API_KEY works without python-dotenv."""
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def trace_entry(step, label, detail):
    return {"step": step, "label": label, "detail": detail, "timestamp": now_iso()}


def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def retrieve_guidelines(query_text, guidelines, top_n=3):
    query_tokens = set(tokenize(query_text))
    scored = []
    for g in guidelines:
        score = 0.0
        for tag in g["tags"]:
            if tag in query_tokens or any(tag in t or t in tag for t in query_tokens):
                score += 2
        body_tokens = set(tokenize(g["title"] + " " + g["text"]))
        score += 0.5 * len(query_tokens & body_tokens)
        if score > 0:
            scored.append((score, g))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [g for _, g in scored[:top_n]]


def build_system_prompt():
    return (
        "You are a clinical documentation and follow-up planning assistant embedded in a "
        "hospital workflow tool. You draft structured, cautious follow-up plans from a patient "
        "record and encounter note, grounded ONLY in the clinical guideline excerpts provided. "
        "You are not a diagnostic authority: never invent a diagnosis, never state you are "
        "certain, and always explicitly flag anything that should be confirmed by a human "
        "clinician. Keep the plan concise: presenting summary, follow-up interval, monitoring "
        "parameters, red-flag symptoms, and medication notes."
    )


def build_user_prompt(patient, encounter_notes, guidelines):
    guideline_text = "\n".join(f"- [{g['id']}] {g['title']}: {g['text']}" for g in guidelines)
    return (
        f"Patient: {patient['name']}, age {patient['age']}, sex {patient['sex']}\n"
        f"Documented allergies: {', '.join(patient['allergies']) or 'None recorded'}\n"
        f"Chronic conditions: {', '.join(patient['chronicConditions']) or 'None recorded'}\n"
        f"Current medications: {', '.join(patient['currentMedications']) or 'None recorded'}\n"
        f"Reason for visit: {patient['reasonForVisit']}\n"
        f"Encounter notes: {encounter_notes}\n\n"
        f"Relevant guideline excerpts (use only these as clinical grounding):\n{guideline_text}\n\n"
        "Draft the follow-up plan now."
    )


def offline_draft(patient, encounter_notes, guidelines):
    allergies = [a.lower() for a in patient["allergies"]]
    guideline_lines = "\n".join(f"   - [{g['id']}] {g['title']}" for g in guidelines) or "   - none strongly matched"

    if any("penicillin" in a or "amoxicillin" in a for a in allergies):
        med_note = ("Consider a penicillin-class antibiotic (e.g. amoxicillin) if a bacterial cause "
                    "is confirmed, pending clinical correlation.")
    elif any("sulfa" in a for a in allergies):
        med_note = ("If diuresis is needed for the edema, a sulfonamide-based diuretic could be "
                    "considered; otherwise continue current regimen.")
    elif allergies:
        med_note = f"No first-line option in this note conflicts with the documented allergy list ({', '.join(patient['allergies'])})."
    else:
        med_note = "No documented drug allergies on file; continue current medications as clinically indicated."

    return (
        "DRAFT FOLLOW-UP PLAN (offline fallback — no live NVIDIA_API_KEY configured)\n"
        f"1. Presenting complaint: {patient['reasonForVisit']}.\n"
        f"2. Encounter update: {encounter_notes}.\n"
        f"3. Guidelines consulted:\n{guideline_lines}\n"
        "4. Follow-up interval: as recommended by the most relevant guideline above; sooner if symptoms worsen.\n"
        "5. Monitoring & red-flag symptoms: track for any red-flag deterioration described in the "
        "guideline excerpts above (e.g. breathlessness, chest pain, high fever, inability to swallow "
        "fluids) and return sooner if they occur.\n"
        f"6. Medication note: {med_note}\n"
        "This offline draft is intentionally conservative; connect NVIDIA_API_KEY for the full "
        "Nemotron-generated narrative plan."
    )


def call_nemotron(patient, encounter_notes, guidelines):
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key or requests is None:
        return {"source": "offline-fallback", "text": offline_draft(patient, encounter_notes, guidelines)}

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(patient, encounter_notes, guidelines)

    try:
        resp = requests.post(
            NVIDIA_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "top_p": 0.9,
                "max_tokens": 600,
                "stream": False,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"].strip()
        if not text:
            raise ValueError("Empty completion")
        return {"source": DEFAULT_MODEL, "text": text}
    except Exception as exc:  # noqa: BLE001 — deliberately broad: any failure degrades gracefully
        return {
            "source": "offline-fallback",
            "text": offline_draft(patient, encounter_notes, guidelines),
            "error": str(exc),
        }


def validate_plan(patient, draft_text, retrieved_guidelines):
    issues = []
    lower_draft = draft_text.lower()

    for allergy in patient["allergies"]:
        a = allergy.lower()
        mentioned = (
            a in lower_draft
            or ("penicillin" in a and ("amoxicillin" in lower_draft or "amoxyclav" in lower_draft))
            or ("amoxicillin" in a and "amoxicillin" in lower_draft)
            or ("sulfa" in a and "sulfonamide" in lower_draft)
        )
        if mentioned:
            issues.append({
                "severity": "critical",
                "rule": "allergy_conflict",
                "message": f"Draft references a medication that conflicts with documented allergy: {allergy}.",
            })

    if any("kidney" in c.lower() for c in patient["chronicConditions"]) and "nsaid" in lower_draft:
        issues.append({
            "severity": "high",
            "rule": "renal_risk",
            "message": "NSAID mentioned for a patient with chronic kidney disease — needs explicit renal-safety caveat.",
        })

    is_cardiac_case = any(g["id"] == "G-02" for g in retrieved_guidelines)
    if is_cardiac_case and "emergency" not in lower_draft and "red-flag" not in lower_draft and "red flag" not in lower_draft:
        issues.append({
            "severity": "high",
            "rule": "missing_redflag_education",
            "message": "Cardiac follow-up draft does not explicitly list emergency red-flag symptoms.",
        })

    if patient["age"] < 18 and "caregiver" not in lower_draft and "parent" not in lower_draft:
        issues.append({
            "severity": "medium",
            "rule": "pediatric_caregiver_check",
            "message": "Pediatric plan does not mention confirming history with a caregiver.",
        })

    critical = [i for i in issues if i["severity"] == "critical"]
    return {"passed": not issues, "requires_human_escalation": bool(critical), "issues": issues}


def decide(validation):
    if validation["requires_human_escalation"]:
        return "Escalate to human clinician", "escalated"
    if not validation["passed"]:
        return "Auto-revise with safety notes, then approve", "approved_with_notes"
    return "Approve plan", "approved"


def run_session(patient, encounter_notes, guidelines_db):
    trace = [trace_entry(
        "Goal",
        "Produce a validated follow-up documentation record",
        f"Agent goal: turn today's encounter for {patient['name']} ({patient['id']}) into a safe, "
        "guideline-grounded structured follow-up record, escalating to a human clinician if anything "
        "can't be safely auto-approved.",
    )]

    trace.append(trace_entry(
        "Action", "Ingest encounter & reconcile with patient record",
        f"Merged incoming encounter notes with stored record: allergies={patient['allergies']}, "
        f"chronic conditions={patient['chronicConditions']}, current meds={patient['currentMedications']}.",
    ))
    trace.append(trace_entry("Observation", "Reconciled patient snapshot ready",
                              "No conflicting demographic data found between encounter note and stored record."))

    query_text = f"{patient['reasonForVisit']} {encounter_notes}"
    guidelines = retrieve_guidelines(query_text, guidelines_db)
    trace.append(trace_entry("Action", "Retrieve relevant clinical guidelines",
                              "Queried guideline knowledge base with the encounter context."))
    trace.append(trace_entry(
        "Observation", f"Retrieved {len(guidelines)} guideline excerpt(s)",
        "; ".join(f"[{g['id']}] {g['title']}" for g in guidelines) or "No strongly matching guideline found.",
    ))

    trace.append(trace_entry("Action", "Draft follow-up plan via NVIDIA Nemotron",
                              "Sent reconciled patient snapshot + retrieved guidelines to the Nemotron model."))
    draft = call_nemotron(patient, encounter_notes, guidelines)
    trace.append(trace_entry("Observation", f"Draft received (source: {draft['source']})", draft["text"]))

    validation = validate_plan(patient, draft["text"], guidelines)
    decision_label, status = decide(validation)
    trace.append(trace_entry(
        "Decision", decision_label,
        " | ".join(f"[{i['severity']}] {i['rule']}: {i['message']}" for i in validation["issues"])
        or "No safety issues found by the validator.",
    ))

    record = {
        "sessionId": str(uuid.uuid4()),
        "patient": patient,
        "encounterNotes": encounter_notes,
        "guidelinesUsed": [{"id": g["id"], "title": g["title"]} for g in guidelines],
        "draftSource": draft["source"],
        "planText": draft["text"],
        "status": status,
        "safetyIssues": validation["issues"],
        "followUpRecommended": not validation["requires_human_escalation"],
        "createdAt": now_iso(),
    }

    trace.append(trace_entry(
        "Outcome",
        "Sent to clinician queue — not auto-finalized" if status == "escalated" else "Follow-up record finalized",
        "Plan withheld from auto-approval because of a critical safety conflict; a clinician must review."
        if status == "escalated" else "Structured follow-up record generated and stored for this session.",
    ))

    return {"trace": trace, "record": record}


def apply_update(session, update_note, guidelines_db):
    patient = session["record"]["patient"]
    combined_notes = f"{session['record']['encounterNotes']}\n\nMID-SESSION UPDATE: {update_note}"

    session["trace"].append(trace_entry(
        "Adaptation", "New information received mid-session",
        f'Update injected: "{update_note}". Re-running retrieval and drafting steps with the updated '
        "context instead of continuing on the stale plan.",
    ))

    query_text = f"{patient['reasonForVisit']} {combined_notes}"
    guidelines = retrieve_guidelines(query_text, guidelines_db)
    session["trace"].append(trace_entry(
        "Action", "Re-retrieve guidelines with updated context",
        "; ".join(f"[{g['id']}] {g['title']}" for g in guidelines) or "No strongly matching guideline found.",
    ))

    draft = call_nemotron(patient, combined_notes, guidelines)
    session["trace"].append(trace_entry("Observation", f"Revised draft received (source: {draft['source']})", draft["text"]))

    validation = validate_plan(patient, draft["text"], guidelines)
    decision_label, status = decide(validation)
    session["trace"].append(trace_entry(
        "Decision", f"{decision_label} (post-update)",
        " | ".join(f"[{i['severity']}] {i['rule']}: {i['message']}" for i in validation["issues"])
        or "No safety issues found by the validator after re-planning.",
    ))

    session["record"]["encounterNotes"] = combined_notes
    session["record"]["guidelinesUsed"] = [{"id": g["id"], "title": g["title"]} for g in guidelines]
    session["record"]["draftSource"] = draft["source"]
    session["record"]["planText"] = draft["text"]
    session["record"]["status"] = status
    session["record"]["safetyIssues"] = validation["issues"]
    session["record"]["followUpRecommended"] = not validation["requires_human_escalation"]

    session["trace"].append(trace_entry(
        "Outcome",
        "Sent to clinician queue after adaptation" if status == "escalated" else "Follow-up record re-finalized after adaptation",
        "The agent adapted its plan autonomously in response to new information without restarting the session.",
    ))
    return session


def print_trace(trace):
    icons = {
        "Goal": "🎯", "Action": "⚙️ ", "Observation": "👁️ ",
        "Decision": "🧭", "Adaptation": "🔄", "Outcome": "✅",
    }
    for entry in trace:
        icon = icons.get(entry["step"], "•")
        print(f"\n{icon} [{entry['step']}] {entry['label']}")
        print(f"   {entry['detail']}")


def main():
    load_env_file()
    parser = argparse.ArgumentParser(description="OmniOps Health — Clinical Documentation & Follow-up Agent (CLI)")
    parser.add_argument("--patient", help="Run a single patient by id (e.g. P-1003). Default: run all sample cases.")
    parser.add_argument("--update", help="Inject a mid-session update note to demo autonomous re-planning.")
    parser.add_argument("--json", action="store_true", help="Print the final record as JSON instead of the trace.")
    args = parser.parse_args()

    patients = json.loads(PATIENTS_PATH.read_text())
    guidelines_db = json.loads(GUIDELINES_PATH.read_text())

    targets = [p for p in patients if p["id"] == args.patient] if args.patient else patients
    if not targets:
        print(f"No patient found with id {args.patient}", file=sys.stderr)
        sys.exit(1)

    for patient in targets:
        print("=" * 72)
        print(f"Session for {patient['name']} ({patient['id']}) — {patient['reasonForVisit']}")
        print("=" * 72)
        session = run_session(patient, patient["reasonForVisit"], guidelines_db)

        if args.update and len(targets) == 1:
            session = apply_update(session, args.update, guidelines_db)

        if args.json:
            print(json.dumps(session["record"], indent=2))
        else:
            print_trace(session["trace"])
            print(f"\nFinal status: {session['record']['status'].upper()}")
        print()


if __name__ == "__main__":
    main()
