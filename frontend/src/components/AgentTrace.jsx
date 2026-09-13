const STEP_META = {
  Goal: { icon: "🎯", cls: "step-goal" },
  Action: { icon: "⚙️", cls: "step-action" },
  Observation: { icon: "👁️", cls: "step-observation" },
  Decision: { icon: "🧭", cls: "step-decision" },
  Adaptation: { icon: "🔄", cls: "step-adaptation" },
  Outcome: { icon: "✅", cls: "step-outcome" },
};

export default function AgentTrace({ trace }) {
  if (!trace || trace.length === 0) return null;

  return (
    <ol className="agent-trace">
      {trace.map((entry, i) => {
        const meta = STEP_META[entry.step] || { icon: "•", cls: "" };
        return (
          <li className={`trace-item ${meta.cls}`} key={i}>
            <div className="trace-marker">
              <span className="trace-icon">{meta.icon}</span>
              {i < trace.length - 1 && <span className="trace-line" />}
            </div>
            <div className="trace-body">
              <div className="trace-heading">
                <span className="trace-step-tag">{entry.step}</span>
                <span className="trace-label">{entry.label}</span>
              </div>
              <p className="trace-detail">{entry.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
