import mongoose from "mongoose";
import { requiredEnv } from "./env";
const globalDb = globalThis as typeof globalThis & { mongoPromise?: Promise<typeof mongoose> };
export async function connectDb() {
  if (!globalDb.mongoPromise) {
    globalDb.mongoPromise = mongoose.connect(requiredEnv("MONGODB_URI"), {
      maxPoolSize: 10, serverSelectionTimeoutMS: 8000, autoIndex: process.env.NODE_ENV !== "production",
    }).catch((error: unknown) => { globalDb.mongoPromise = undefined; throw error; });
  }
  return globalDb.mongoPromise;
}
