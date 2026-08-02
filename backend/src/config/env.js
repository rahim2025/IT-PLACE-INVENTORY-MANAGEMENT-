import dotenv from "dotenv";

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required("MONGO_URI", "mongodb://127.0.0.1:27017/it_place_inventory"),
  jwtSecret: required("JWT_SECRET", "dev-only-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5183",
  seedOwner: {
    name: process.env.SEED_OWNER_NAME ?? "Owner Account",
    email: process.env.SEED_OWNER_EMAIL ?? "owner@itplace.shop",
    password: process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!",
  },
  email: {
    user: process.env.EMAIL_USER,
    appPassword: process.env.APP_PASSWORD,
  },
};

export const isProduction = env.nodeEnv === "production";
