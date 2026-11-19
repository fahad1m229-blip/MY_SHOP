require("dotenv").config();

function getRequired(name, fallback = "") {
  const val = process.env[name];
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback;
}

const env = {
  port: parseInt(process.env.PORT || "10000", 10),
  nodeEnv: getRequired("NODE_ENV", "development"),
  isProd: getRequired("NODE_ENV", "development") === "production",
  cookieSecure: process.env.COOKIE_SECURE === "true" || getRequired("NODE_ENV", "development") === "production",
  frontendOrigins: getRequired("ADMIN_FRONTEND_ORIGIN", "http://localhost:10000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  adminUsername: getRequired("ADMIN_USERNAME", "superadmin"),
  adminEmail: getRequired("ADMIN_EMAIL", "admin@myshop.example"),
  adminPasswordHash: getRequired("ADMIN_PASSWORD_HASH", ""),
  jwtSecret: getRequired("JWT_SECRET", ""),
  sessionTtlHours: Math.max(1, parseInt(process.env.SESSION_TTL_HOURS || "12", 10)),
  firebaseProjectId: getRequired("FIREBASE_PROJECT_ID", "gen-lang-client-0209162535"),
  firestoreDatabaseId: getRequired(
    "FIRESTORE_DATABASE_ID",
    "ai-studio-android-myshop-e9b08858-2004-4d98-a470-5851be985332"
  ),
  firebaseStorageBucket: getRequired(
    "FIREBASE_STORAGE_BUCKET",
    "gen-lang-client-0209162535.firebasestorage.app"
  ),
  serviceAccountJson: getRequired("FIREBASE_SERVICE_ACCOUNT_JSON", ""),
  serviceAccountBase64: getRequired("FIREBASE_SERVICE_ACCOUNT_BASE64", ""),
};

module.exports = { env };
