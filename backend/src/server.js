import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import app from "./app.js";

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`IT Place Inventory API listening on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});
