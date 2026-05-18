import { config } from "./config";
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";

console.log("BOOT START");

logger.info(
  {
    NODE_ENV: config.nodeEnv,
    PORT: config.port,
    HOST: config.host,
    DATABASE_URL: config.databaseUrl ? "set" : "MISSING",
    OPENAI_KEY: config.openaiApiKey ? "set" : "MISSING",
    STRIPE_KEY: config.stripeSecretKey ? "set" : "MISSING",
    RESEND_KEY: config.resendApiKey ? "set" : "MISSING",
    VAPID: config.vapidPublicKey ? "set" : "not set (push disabled)",
    SCHEDULERS: config.shouldRunSchedulers,
  },
  "Startup environment check",
);

// 🚨 HARD FAIL VISIBILITY (no more silent crashes)
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION", err);
});

const server = createServer(app);

server.listen(config.port, config.host, () => {
  logger.info({ port: config.port, host: config.host }, "Server listening");
});

// ✅ REGISTER ROUTES AFTER SERVER STARTS
(async () => {
  try {
    await registerRoutes(server, app);
    logger.info("Routes registered successfully");
  } catch (err) {
    logger.error({ err }, "Failed to register routes");
  }
})();
