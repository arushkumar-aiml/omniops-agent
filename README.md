# 🩺 OmniOps Health

**Know exactly what your prescription means for your day.**

Tech Zephyr 4.0 · Agentic AI Hackathon · IIT Bhubaneswar

## What it does

You type in the medicine names from a doctor's prescription. OmniOps Health tells
you, per medicine:

- What it's for, in plain language
- How it's usually taken (with food, on empty stomach, once daily, etc.)
- Foods and drinks that help — and ones to avoid
- Simple lifestyle tips for faster recovery
- Warning signs that mean "call your doctor now"

It's built as a **prototype knowledge assistant** on top of a small demo medicine
database — not a diagnostic or dosing tool. See the disclaimer at the bottom of
the app and in every API response.

## Project structure

```
omniops-health/
├── backend/                 # Node/Express API
│   ├── data/medicines.json    # Demo medicine knowledge base
│   ├── routes/prescription.js # /api/prescription routes
│   ├── server.js               # App entrypoint
│   └── package.json
├── frontend/                # React (Vite) UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── PrescriptionForm.jsx
│   │   │   └── MedicineCard.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
└── README.md
```

## Running it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
# → 🩺 OmniOps Health API running on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → open http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend on port 5000
(see `frontend/vite.config.js`), so both just need to be running side by side.

## API

**`POST /api/prescription/analyze`**

```json
{ "medicines": ["Dolo 650", "Amoxyclav", "Vitamin D3"] }
```

Returns matched medicine info, any names it couldn't find, combined
guidance across all matched medicines, and a standard disclaimer.

**`GET /api/prescription/medicines`** — lists everything currently in the
demo knowledge base (10 common medicines to start: Paracetamol, Ibuprofen,
Amoxicillin, Azithromycin, Metformin, Amlodipine, Omeprazole, Cetirizine,
Vitamin D3, Iron).

**`GET /api/health`** — basic liveness check.

## Design notes

- Palette: pine green + warm ivory + amber accent — calm and clinical
  without being cold or generic-medical (no blue/red cross clichés).
- Typography: Fraunces (serif) for headings, Work Sans for body text.
- The "Good to have / Better to avoid" split and the lifestyle-tip pills are
  the app's core visual idea — food and habits sit right next to the medicine
  they relate to, instead of a separate wall of text.

## Roadmap

- Round 1 (now): core matching engine, 10-medicine demo knowledge base,
  working full-stack prototype.
- Round 2: OCR/photo upload of an actual prescription, larger verified drug
  database, multi-language support.
- Beyond: personalised reminders, interaction checks across multiple
  medicines, pharmacist-in-the-loop verification.

## Disclaimer

OmniOps Health is a hackathon prototype for general educational awareness
only. It is **not** medical advice and does not replace a doctor's or
pharmacist's instructions. Always take medicines exactly as prescribed.
