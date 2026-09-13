import { useState } from "react";
import Header from "./components/Header.jsx";
import PrescriptionForm from "./components/PrescriptionForm.jsx";
import MedicineCard from "./components/MedicineCard.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (medicines) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/prescription/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not reach the OmniOps Health server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <section className="hero" id="how-it-works">
        <h1>Know exactly what your prescription means for your day.</h1>
        <p>
          Type in what the doctor prescribed — OmniOps Health explains what each
          medicine is for, what to eat or avoid, and simple lifestyle tips to
          recover well.
        </p>

        <PrescriptionForm onAnalyze={handleAnalyze} loading={loading} error={error} />
      </section>

      {result && (
        <section className="results">
          <h2 className="results-summary">Your prescription, explained</h2>
          <p className="results-sub">
            Matched {result.summary.matched} of {result.summary.total_queried} medicine
            {result.summary.total_queried === 1 ? "" : "s"} you entered.
          </p>

          {result.unmatched_names.length > 0 && (
            <div className="unmatched-note">
              We couldn't find <strong>{result.unmatched_names.join(", ")}</strong> in our
              demo knowledge base yet — please check the spelling or ask your pharmacist
              directly about {result.unmatched_names.length === 1 ? "it" : "them"}.
            </div>
          )}

          {result.medicines.map((med) => (
            <MedicineCard key={med.id} medicine={med} />
          ))}
        </section>
      )}

      {!result && !loading && (
        <div className="empty-state">
          <h3>Nothing analysed yet</h3>
          <p>Add the medicine names from your prescription above and hit explain.</p>
        </div>
      )}

      <p className="disclaimer" id="disclaimer">
        <strong>Disclaimer:</strong> OmniOps Health is a hackathon prototype built on a
        small demo knowledge base for general educational awareness only. It is not
        medical advice and must not replace your doctor's or pharmacist's instructions.
        Always take medicines exactly as prescribed, and consult a qualified professional
        before changing your diet, dosage, or routine.
      </p>
    </div>
  );
}
