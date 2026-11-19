const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { getDb, getFirebaseStatus } = require("../config/firebase");
const { getSigningSecret } = require("./auth");

const CUSTOMER_COOKIE_NAME = "myshop_customer_session";

function signCustomerToken(payload) {
  return jwt.sign(
    {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName,
      role: "customer",
    },
    getSigningSecret(),
    {
      expiresIn: "7d",
      issuer: "my-shop-customer",
    }
  );
}

function setCustomerSessionCookie(res, token) {
  res.cookie(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    maxAge: 7 * 24 * 3600 * 1000,
    path: "/",
  });
}

function clearCustomerSessionCookie(res) {
  res.clearCookie(CUSTOMER_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    path: "/",
  });
}

async function resolveCustomerFromRequest(req) {
  const token = req.cookies?.[CUSTOMER_COOKIE_NAME];
  if (!token) return null;
  const decoded = jwt.verify(token, getSigningSecret(), { issuer: "my-shop-customer" });
  if (decoded.role !== "customer" || !decoded.uid) return null;

  if (getFirebaseStatus().connected) {
    const snap = await getDb().collection("users").doc(decoded.uid).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (data.suspended) {
      const err = new Error("Your customer account has been suspended. Please contact support.");
      err.statusCode = 403;
      throw err;
    }
    return {
      uid: snap.id,
      email: data.email || decoded.email,
      displayName: data.displayName || decoded.displayName,
      phone: data.phone || "",
      language: data.language || "EN",
      darkMode: data.darkMode !== false,
      points: Number(data.points || 0),
      walletBalance: Number(data.walletBalance || 0),
    };
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    displayName: decoded.displayName,
  };
}

async function requireCustomerAuth(req, res, next) {
  try {
    const customer = await resolveCustomerFromRequest(req);
    if (!customer) {
      return res.status(401).json({ error: "Please sign in or create a customer account to continue." });
    }
    req.customerUser = customer;
    next();
  } catch (err) {
    if (err.statusCode === 403) {
      clearCustomerSessionCookie(res);
      return res.status(403).json({ error: err.message });
    }
    clearCustomerSessionCookie(res);
    return res.status(401).json({ error: "Invalid or expired customer session. Please sign in again." });
  }
}

async function optionalCustomerAuth(req, _res, next) {
  try {
    req.customerUser = await resolveCustomerFromRequest(req);
  } catch {
    req.customerUser = null;
  }
  next();
}

module.exports = {
  CUSTOMER_COOKIE_NAME,
  signCustomerToken,
  setCustomerSessionCookie,
  clearCustomerSessionCookie,
  requireCustomerAuth,
  optionalCustomerAuth,
};
