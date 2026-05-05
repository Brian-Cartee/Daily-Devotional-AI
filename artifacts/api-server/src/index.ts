import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";

// 🔍 BOOT VISIBILITY (you WILL see this in Railway logs)
console.log("BOOT START");

// 🔍 ENV CHECK (helps debug missing vars without crashing)
logger.info(
  {
    NODE_ENV: process.env.NODE_ENV ?? "(not set)",
    PORT: process.env.PORT ?? "(not set)",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    OPENAI_KEY: process.env.OPENAI_API_KEY ? "set" : "MISSING",
    STRIPE_KEY: process.env.STRIPE_SECRET_KEY ? "set" : "MISSING",
    RESEND_KEY: process.env.RESEND_API_KEY ? "set" : "MISSING",
    VAPID: process.env.VAPID_PUBLIC_KEY ? "set" : "not set (push disabled)",
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

// ✅ PORT
const port = Number(process.env.PORT) || 3000;

// ✅ CREATE SERVER
const server = createServer(app);

// ✅ START SERVER IMMEDIATELY (THIS FIXES RAILWAY)
server.listen(port, () => {
  logger.info({ port }, "Server listening");
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
