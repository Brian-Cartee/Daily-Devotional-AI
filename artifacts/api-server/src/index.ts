import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";

const port = Number(process.env.PORT) || 3000;

logger.info({
  port,
  NODE_ENV: process.env.NODE_ENV ?? "(not set)",
  OPENAI_KEY: process.env.OPENAI_API_KEY ? "set" : "MISSING",
  DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
  STRIPE_KEY: process.env.STRIPE_SECRET_KEY ? "set" : "MISSING",
  RESEND_KEY: process.env.RESEND_API_KEY ? "set" : "MISSING",
  VAPID: process.env.VAPID_PUBLIC_KEY ? "set" : "not set (push disabled)",
}, "Server startup environment check");

const server = createServer(app);

registerRoutes(server, app)
  .then(() => {
    server.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err: unknown) => {
    logger.error({ err }, "Failed to register routes");
    process.exit(1);
  });
