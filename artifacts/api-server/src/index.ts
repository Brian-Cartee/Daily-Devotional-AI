import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";

const port = Number(process.env.PORT) || 3000;
const server = createServer(app);

registerRoutes(server, app)
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err: unknown) => {
    logger.error({ err }, "Failed to register routes");
    process.exit(1);
  });
