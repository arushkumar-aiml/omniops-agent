require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prescriptionRoutes = require("./routes/prescription");
const agentRoutes = require("./routes/agent");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "OmniOps Health API",
    nemotronConfigured: Boolean(process.env.NVIDIA_API_KEY),
  });
});

app.use("/api/prescription", prescriptionRoutes);
app.use("/api/agent", agentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🩺 OmniOps Health API running on http://localhost:${PORT}`);
});
