import { useState } from "react";

export default function PrescriptionForm({ onAnalyze, loading, error }) {
  const [rows, setRows] = useState(["", "", ""]);

  const updateRow = (index, value) => {
    const next = [...rows];
    next[index] = value;
    setRows(next);
  };

  const addRow = () => setRows([...rows, ""]);

  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const medicines = rows.map((r) => r.trim()).filter(Boolean);
    if (medicines.length === 0) return;
    onAnalyze(medicines);
  };

  return (
    <form className="rx-form" onSubmit={handleSubmit}>
      <label className="rx-form-label">
        Type each medicine name exactly as it appears on your prescription
      </label>

      {rows.map((value, i) => (
        <div className="rx-row" key={i}>
          <input
            type="text"
            placeholder={`e.g. ${["Dolo 650", "Amoxyclav 625", "Vitamin D3"][i % 3]}`}
            value={value}
            onChange={(e) => updateRow(i, e.target.value)}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => removeRow(i)}
            aria-label="Remove this line"
          >
            −
          </button>
        </div>
      ))}

      <div className="rx-actions">
        <button type="button" className="link-btn" onClick={addRow}>
          + Add another medicine
        </button>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Reading prescription…" : "Explain my prescription"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </form>
  );
}
