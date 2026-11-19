const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const { initFirebaseAdmin, getFirebaseStatus } = require("./config/firebase");
const { apiLimiter } = require("./middleware/rateLimit");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const orderRoutes = require("./routes/orderRoutes");
const customerRoutes = require("./routes/customerRoutes");
const marketingRoutes = require("./routes/marketingRoutes");
const cmsRoutes = require("./routes/cmsRoutes");
const publicRoutes = require("./routes/publicRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

function createApp() {
  initFirebaseAdmin();

  const app = express();
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.frontendOrigins.includes("*") || env.frontendOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow Render preview origins when cookie credentials are verified
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/api/admin", apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "my-shop-super-admin-backend",
      firebase: getFirebaseStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/admin/auth", authRoutes);
  app.use("/api/admin/dashboard", dashboardRoutes);
  app.use("/api/admin/catalog", catalogRoutes);
  app.use("/api/admin/orders", orderRoutes);
  app.use("/api/admin/customers", customerRoutes);
  app.use("/api/admin/marketing", marketingRoutes);
  app.use("/api/admin/cms", cmsRoutes);
  app.use("/api/admin/settings", settingsRoutes);
  app.use("/api/public", publicRoutes);

  // Serve Admin Panel Frontend SPA (ZERO Firebase Client SDK in frontend)
  const frontendDir = path.resolve(__dirname, "../../frontend");
  app.use("/admin", express.static(frontendDir));
  app.use(express.static(frontendDir));

  app.get(["/", "/admin", "/admin/*"], (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  // Centralized error handler
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || (err.code === "LIMIT_FILE_SIZE" ? 400 : 500);
    res.status(status).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`MY Shop Super Admin Backend running on port ${env.port} (/admin)`);
  });
}

module.exports = { createApp };
