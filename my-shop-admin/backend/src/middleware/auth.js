const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { env } = require("../config/env");
const { getDb, getFirebaseStatus } = require("../config/firebase");

const COOKIE_NAME = "myshop_admin_session";
const failedAttempts = new Map(); // ip -> { count, lockedUntil }

function getSigningSecret() {
  if (env.jwtSecret && env.jwtSecret.length >= 16) return env.jwtSecret;
  if (!env.isProd) {
    // Ephemeral per-process dev secret when JWT_SECRET is omitted in local test/dev only
    if (!global.__myshopDevJwtSecret) {
      global.__myshopDevJwtSecret = crypto.randomBytes(32).toString("hex");
    }
    return global.__myshopDevJwtSecret;
  }
  throw new Error("JWT_SECRET environment variable must be configured in production.");
}

async function getSecurityDoc() {
  try {
    if (!getFirebaseStatus().connected) return null;
    const snap = await getDb().collection("admin_settings").doc("security").get();
    return snap.exists ? snap.data() : null;
  } catch {
    return null;
  }
}

async function resolveActivePasswordHash() {
  const sec = await getSecurityDoc();
  if (sec && typeof sec.passwordHash === "string" && sec.passwordHash.startsWith("$2")) {
    return {
      hash: sec.passwordHash,
      tokenVersion: Number(sec.tokenVersion || 1),
      username: sec.username || env.adminUsername,
      email: sec.email || env.adminEmail,
    };
  }
  return {
    hash: env.adminPasswordHash,
    tokenVersion: Number(sec?.tokenVersion || 1),
    username: env.adminUsername,
    email: env.adminEmail,
  };
}

function checkLockout(ip) {
  const entry = failedAttempts.get(ip);
  if (!entry) return { locked: false, retryAfterSec: 0 };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    failedAttempts.delete(ip);
  }
  return { locked: false, retryAfterSec: 0 };
}

function recordFailedAttempt(ip) {
  const prev = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  const nextCount = prev.count + 1;
  const lockedUntil = nextCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
  failedAttempts.set(ip, { count: nextCount, lockedUntil });
  return { count: nextCount, lockedUntil };
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

function signSessionToken(payload) {
  return jwt.sign(payload, getSigningSecret(), {
    expiresIn: `${env.sessionTtlHours}h`,
    issuer: "my-shop-super-admin",
  });
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    maxAge: env.sessionTtlHours * 3600 * 1000,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    path: "/",
  });
}

async function requireAdminAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Authentication required. Please sign in at /admin." });
    }
    const decoded = jwt.verify(token, getSigningSecret(), { issuer: "my-shop-super-admin" });
    if (decoded.role !== "super_admin") {
      return res.status(403).json({ error: "Insufficient admin privileges." });
    }
    const sec = await getSecurityDoc();
    const activeTokenVersion = Number(sec?.tokenVersion || 1);
    if (Number(decoded.tokenVersion || 1) < activeTokenVersion) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "Session expired or revoked. Please sign in again." });
    }
    req.adminUser = {
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      tokenVersion: decoded.tokenVersion,
    };
    next();
  } catch (err) {
    clearSessionCookie(res);
    return res.status(401).json({ error: "Invalid or expired admin session." });
  }
}

async function verifyAdminPassword(plain, hash) {
  if (!hash || !hash.startsWith("$2")) return false;
  return bcrypt.compare(plain, hash);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

module.exports = {
  COOKIE_NAME,
  getSigningSecret,
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
};
