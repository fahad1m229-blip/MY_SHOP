const { admin, getDb, getFirebaseStatus } = require("../config/firebase");

async function logAdminAudit(req, action, targetPath, details = {}) {
  try {
    if (!getFirebaseStatus().connected) return;
    const db = getDb();
    await db.collection("admin_audit_logs").add({
      actor: req.adminUser?.username || "system",
      action,
      targetPath,
      details,
      ip: req.ip || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-blocking audit logging
  }
}

module.exports = { logAdminAudit };
