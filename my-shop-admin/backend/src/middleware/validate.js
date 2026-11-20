function isValidHttpUrl(str) {
  if (typeof str !== "string" || !str.trim()) return false;
  try {
    const url = new URL(str.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// Allows relative local upload paths (/uploads/...) OR http(s) URLs
function isValidAssetUrl(str) {
  if (typeof str !== "string" || !str.trim()) return false;
  const s = str.trim();
  if (s.startsWith("/uploads/") && !s.includes("..")) return true;
  return isValidHttpUrl(s);
}

function sanitizeId(raw, fallbackPrefix = "item") {
  const cleaned = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 100);
  return cleaned || `${fallbackPrefix}_${Date.now()}`;
}

// Preserves exact legacy Firestore document IDs while preventing path traversal
function sanitizeDocIdParam(raw) {
  let decoded = String(raw || "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep raw string if already decoded
  }
  const trimmed = decoded.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0")) {
    const err = new Error("Invalid document identifier.");
    err.statusCode = 400;
    throw err;
  }
  return trimmed.slice(0, 200);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toSafeNumber(val, fallback = 0, min = 0, max = 100000000) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function toIsoDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts._seconds === "number") return new Date(ts._seconds * 1000).toISOString();
  return String(ts);
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit || "25", 10) || 25));
  return { page, limit };
}

module.exports = {
  isValidHttpUrl,
  isValidAssetUrl,
  sanitizeId,
  sanitizeDocIdParam,
  escapeHtml,
  toSafeNumber,
  toIsoDate,
  parsePagination,
};
