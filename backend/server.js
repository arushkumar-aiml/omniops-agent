require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prescriptionRoutes = require("./routes/prescription");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "OmniOps Health API" });
});

app.use("/api/prescription", prescriptionRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🩺 OmniOps Health API running on http://localhost:${PORT}`);
});
