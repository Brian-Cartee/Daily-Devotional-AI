console.log("BOOTING SERVER...");
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = createServer(app);

registerRoutes(server, app)
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on ${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error("FAILED BEFORE START:", err);
    process.exit(1);
  });
