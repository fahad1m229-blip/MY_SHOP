const crypto = require("crypto");
const express = require("express");
const { admin, getDb, getFirebaseStatus } = require("../config/firebase");
const {
  resolveActivePasswordHash,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAdminAuth,
  verifyAdminPassword,
  hashPassword,
} = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimit");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();

// POST /api/admin/auth/login
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const ip = req.ip || "unknown";
    const lock = checkLockout(ip);
    if (lock.locked) {
      return res.status(429).json({
        error: `Too many failed login attempts. Try again in ${lock.retryAfterSec}s.`,
      });
    }

    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const active = await resolveActivePasswordHash();
    if (!active.hash) {
      return res.status(503).json({
        error: "ADMIN_PASSWORD_HASH is not configured in backend environment variables.",
      });
    }

    const usernameMatch = username.trim().toLowerCase() === String(active.username).toLowerCase();
    const passwordMatch = await verifyAdminPassword(password, active.hash);

    if (!usernameMatch || !passwordMatch) {
      const attempt = recordFailedAttempt(ip);
      return res.status(401).json({
        error:
          attempt.lockedUntil > 0
            ? "Account temporarily locked due to 5 failed attempts. Wait 15 minutes."
            : "Invalid admin username or password.",
      });
    }

    clearFailedAttempts(ip);
    const token = signSessionToken({
      username: active.username,
      email: active.email,
      role: "super_admin",
      tokenVersion: active.tokenVersion,
    });
    setSessionCookie(res, token);

    await logAdminAudit({ adminUser: { username: active.username }, ip }, "ADMIN_LOGIN", "admin_auth", {
      username: active.username,
    });

    res.json({
      authenticated: true,
      admin: {
        username: active.username,
        email: active.email,
        role: "super_admin",
      },
      firebase: getFirebaseStatus(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/auth/logout
router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/admin/auth/me
router.get("/me", requireAdminAuth, (req, res) => {
  res.json({
    authenticated: true,
    admin: req.adminUser,
    firebase: getFirebaseStatus(),
  });
});

// POST /api/admin/auth/change-password
router.post("/change-password", requireAdminAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 10) {
      return res.status(400).json({ error: "New password must be at least 10 characters." });
    }

    const active = await resolveActivePasswordHash();
    const ok = await verifyAdminPassword(currentPassword, active.hash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const nextHash = await hashPassword(newPassword);
    const nextVersion = active.tokenVersion + 1;
    await getDb().collection("admin_settings").doc("security").set(
      {
        username: active.username,
        email: active.email,
        passwordHash: nextHash,
        tokenVersion: nextVersion,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const newToken = signSessionToken({
      username: active.username,
      email: active.email,
      role: "super_admin",
      tokenVersion: nextVersion,
    });
    setSessionCookie(res, newToken);

    await logAdminAudit(req, "ADMIN_PASSWORD_CHANGED", "admin_settings/security");
    res.json({ ok: true, message: "Password updated and older sessions revoked." });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/auth/request-recovery
router.post("/request-recovery", loginLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const active = await resolveActivePasswordHash();
    if (!email || email.trim().toLowerCase() !== String(active.email).toLowerCase()) {
      // Return generic message to prevent email enumeration
      return res.json({
        ok: true,
        message: "If the admin email matches our records, a time-limited recovery code has been generated in server logs / configured recovery channel.",
      });
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAtMs = Date.now() + 15 * 60 * 1000;

    if (getFirebaseStatus().connected) {
      await getDb().collection("admin_settings").doc("security").set(
        {
          recoveryTokenHash: tokenHash,
          recoveryExpiresAtMs: expiresAtMs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Never leak token in HTTP response; log securely on Render backend stdout
    console.info(`[MY SHOP ADMIN RECOVERY] Recovery token issued for ${active.email} (expires in 15m): ${rawToken}`);

    res.json({
      ok: true,
      message: "If the admin email matches our records, a 15-minute recovery token was issued on the secure server.",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/auth/reset-password
router.post("/reset-password", loginLimiter, async (req, res, next) => {
  try {
    const { recoveryToken, newPassword } = req.body || {};
    if (typeof recoveryToken !== "string" || typeof newPassword !== "string" || newPassword.length < 10) {
      return res.status(400).json({ error: "Valid recovery token and 10+ character password required." });
    }

    const db = getDb();
    const snap = await db.collection("admin_settings").doc("security").get();
    const sec = snap.exists ? snap.data() : null;
    const expectedHash = sec?.recoveryTokenHash;
    const expiresAtMs = Number(sec?.recoveryExpiresAtMs || 0);
    const providedHash = crypto.createHash("sha256").update(recoveryToken.trim()).digest("hex");

    if (!expectedHash || Date.now() > expiresAtMs || providedHash !== expectedHash) {
      return res.status(400).json({ error: "Invalid or expired recovery token." });
    }

    const nextHash = await hashPassword(newPassword);
    const nextVersion = Number(sec?.tokenVersion || 1) + 1;
    await db.collection("admin_settings").doc("security").set(
      {
        passwordHash: nextHash,
        tokenVersion: nextVersion,
        recoveryTokenHash: admin.firestore.FieldValue.delete(),
        recoveryExpiresAtMs: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    clearSessionCookie(res);
    res.json({ ok: true, message: "Admin password reset successfully. Sign in with your new password." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
