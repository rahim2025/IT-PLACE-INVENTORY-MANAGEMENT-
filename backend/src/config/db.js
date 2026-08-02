import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

// Cached across warm serverless invocations so each request doesn't open a
// new connection (Vercel functions reuse the module scope between calls).
let connectionPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.mongoUri)
      .then((conn) => {
        console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
}
