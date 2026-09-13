const STATUS_META = {
  approved: { label: "Approved", cls: "status-approved" },
  approved_with_notes: { label: "Approved with safety notes", cls: "status-notes" },
  escalated: { label: "Escalated to clinician", cls: "status-escalated" },
};

export default function FollowUpRecord({ record }) {
  if (!record) return null;
  const status = STATUS_META[record.status] || { label: record.status, cls: "" };

  return (
    <div className="record-card">
      <div className="record-head">
        <div>
          <h3>Structured follow-up record</h3>
          <p className="record-sub">
            {record.patient.name} · {record.patient.id} · session finalized via{" "}
            <code>{record.draftSource}</code>
          </p>
        </div>
        <span className={`status-pill ${status.cls}`}>{status.label}</span>
      </div>

      {record.safetyIssues && record.safetyIssues.length > 0 && (
        <div className="safety-issues">
          <h4>Safety validator findings</h4>
          <ul>
            {record.safetyIssues.map((issue, i) => (
              <li key={i} className={`issue-${issue.severity}`}>
                <span className="issue-severity">{issue.severity}</span>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="guideline-chips">
        {record.guidelinesUsed.map((g) => (
          <span className="chip" key={g.id} title={g.title}>
            {g.id}
          </span>
        ))}
      </div>

      <pre className="plan-text">{record.planText}</pre>

      <p className="record-disclaimer">
        This is a demo agent output, not a validated clinical document. Every escalated or
        note-flagged plan requires sign-off by a licensed clinician before use.
      </p>
    </div>
  );
}
