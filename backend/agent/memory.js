// Simple in-memory session store. Good enough for a hackathon demo; would be
// swapped for Redis/Postgres in a production deployment.
const sessions = new Map();

function saveSession(sessionId, data) {
  sessions.set(sessionId, data);
  return data;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function listSessions() {
  return [...sessions.values()];
}

module.exports = { saveSession, getSession, listSessions };
