const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { env } = require("./env");

let firebaseApp = null;
let firestoreDb = null;
let initError = null;

function resolveServiceAccount() {
  if (env.serviceAccountJson) {
    return JSON.parse(env.serviceAccountJson);
  }
  if (env.serviceAccountBase64) {
    const decoded = Buffer.from(env.serviceAccountBase64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }
  return null;
}

function initFirebaseAdmin() {
  if (firebaseApp) return { app: firebaseApp, db: firestoreDb, error: null };
  try {
    const serviceAccount = resolveServiceAccount();
    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: env.firebaseProjectId || serviceAccount.project_id,
        storageBucket: env.firebaseStorageBucket,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIRESTORE_EMULATOR_HOST) {
      firebaseApp = admin.initializeApp({
        projectId: env.firebaseProjectId,
        storageBucket: env.firebaseStorageBucket,
      });
    } else {
      initError = new Error(
        "Firebase Admin SDK credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, or GOOGLE_APPLICATION_CREDENTIALS on Render."
      );
      return { app: null, db: null, error: initError };
    }

    // Target the EXACT SAME named Firestore database used by MY Shop User Panel
    firestoreDb = env.firestoreDatabaseId
      ? getFirestore(firebaseApp, env.firestoreDatabaseId)
      : getFirestore(firebaseApp);

    initError = null;
    return { app: firebaseApp, db: firestoreDb, error: null };
  } catch (err) {
    initError = err;
    return { app: null, db: null, error: err };
  }
}

function getDb() {
  const { db, error } = initFirebaseAdmin();
  if (!db) {
    const e = new Error(error?.message || "Firebase Admin Firestore unavailable");
    e.statusCode = 503;
    throw e;
  }
  return db;
}

function getAdminAuth() {
  const { app, error } = initFirebaseAdmin();
  if (!app) {
    const e = new Error(error?.message || "Firebase Admin Auth unavailable");
    e.statusCode = 503;
    throw e;
  }
  return admin.auth(app);
}

function getStorageBucket() {
  const { app, error } = initFirebaseAdmin();
  if (!app) {
    const e = new Error(error?.message || "Firebase Admin Storage unavailable");
    e.statusCode = 503;
    throw e;
  }
  return admin.storage(app).bucket(env.firebaseStorageBucket);
}

function getFirebaseStatus() {
  const { db, error } = initFirebaseAdmin();
  return {
    connected: Boolean(db),
    projectId: env.firebaseProjectId,
    databaseId: env.firestoreDatabaseId,
    storageBucket: env.firebaseStorageBucket,
    error: error ? error.message : null,
  };
}

module.exports = {
  admin,
  initFirebaseAdmin,
  getDb,
  getAdminAuth,
  getStorageBucket,
  getFirebaseStatus,
};
