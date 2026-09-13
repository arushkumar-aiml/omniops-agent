import { useEffect, useState } from "react";
import AgentTrace from "./AgentTrace.jsx";
import FollowUpRecord from "./FollowUpRecord.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function AgentPanel() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [encounterNotes, setEncounterNotes] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateNote, setUpdateNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/agent/patients`)
      .then((r) => r.json())
      .then((data) => {
        setPatients(data.patients || []);
        if (data.patients?.length) {
          setPatientId(data.patients[0].id);
          setEncounterNotes(data.patients[0].reasonForVisit);
        }
      })
      .catch(() => setError("Could not reach the OmniOps Health agent API."));
  }, []);

  const selectedPatient = patients.find((p) => p.id === patientId);

  const handlePatientChange = (id) => {
    setPatientId(id);
    const p = patients.find((x) => x.id === id);
    if (p) setEncounterNotes(p.reasonForVisit);
    setSession(null);
    setUpdateNote("");
  };

  const runSession = async (e) => {
    e.preventDefault();
    if (!patientId || !encounterNotes.trim()) return;
    setLoading(true);
    setError("");
    setSession(null);
    try {
      const res = await fetch(`${API_BASE}/agent/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, encounterNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent session failed.");
      setSession(data);
    } catch (err) {
      setError(err.message || "Could not run the agent session.");
    } finally {
      setLoading(false);
    }
  };

  const injectUpdate = async (e) => {
    e.preventDefault();
    if (!session || !updateNote.trim()) return;
    setUpdating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/agent/session/${session.sessionId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: updateNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adaptation step failed.");
      setSession(data);
      setUpdateNote("");
    } catch (err) {
      setError(err.message || "Could not apply the update.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className="agent-section">
      <div className="hero agent-hero">
        <h1>Autonomous Clinical Documentation &amp; Follow-up Agent</h1>
        <p>
          Pick a synthetic patient, run the agent on today's encounter, and watch it plan,
          retrieve guidelines, draft with NVIDIA Nemotron, validate its own output, and either
          approve or escalate — live, step by step.
        </p>
      </div>

      <form className="agent-form" onSubmit={runSession}>
        <div className="agent-form-row">
          <label>
            Patient
            <select value={patientId} onChange={(e) => handlePatientChange(e.target.value)}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.id} ({p.age}{p.sex})
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedPatient && (
          <div className="patient-summary">
            <span>
              <strong>Allergies:</strong> {selectedPatient.allergies.join(", ") || "None recorded"}
            </span>
            <span>
              <strong>Chronic conditions:</strong>{" "}
              {selectedPatient.chronicConditions.join(", ") || "None recorded"}
            </span>
            <span>
              <strong>Current meds:</strong> {selectedPatient.currentMedications.join(", ") || "None"}
            </span>
          </div>
        )}

        <label className="agent-notes-label">
          Encounter notes
          <textarea
            rows={3}
            value={encounterNotes}
            onChange={(e) => setEncounterNotes(e.target.value)}
            placeholder="Describe today's encounter…"
          />
        </label>

        <div className="rx-actions">
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Running agent…" : "Run agent on this encounter"}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </form>

      {session && (
        <div className="agent-results">
          <div className="agent-trace-col">
            <h2 className="results-summary">Live agent trace</h2>
            <AgentTrace trace={session.trace} />

            <form className="update-box" onSubmit={injectUpdate}>
              <label>
                Inject a mid-session update (demonstrates autonomous adaptation)
                <input
                  type="text"
                  placeholder="e.g. Rapid strep test came back positive."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                />
              </label>
              <button type="submit" className="secondary-btn" disabled={updating}>
                {updating ? "Re-planning…" : "Send update to agent"}
              </button>
            </form>
          </div>

          <div className="agent-record-col">
            <FollowUpRecord record={session.record} />
          </div>
        </div>
      )}
    </section>
  );
}
