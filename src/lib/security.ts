import { createHmac, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { authSecret, siteUrl } from "./env";
import { assert, AppError } from "./errors";
import { RateLimit } from "@/models";
import { connectDb } from "./db";
export const hashPassword = (password: string) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);
export const tokenDigest = (token: string) => createHmac("sha256", authSecret()).update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function sameOrigin(request: Request) {
  assert(request.headers.get("origin") === new URL(siteUrl()).origin, 403, "Invalid request origin");
  assert(request.headers.get("sec-fetch-site") !== "cross-site", 403, "Cross-site request denied");
}
export function clientKey(request: Request) {
  const ip = process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : "shared";
  return tokenDigest(ip || "shared");
}
export async function rateLimit(key: string, maximum: number, periodMs: number) {
  await connectDb();
  const bucket = Math.floor(Date.now() / periodMs);
  const id = tokenDigest(`${key}:${bucket}`);
  let record;
  try {
    record = await RateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * periodMs) } }, { upsert: true, new: true });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) record = await RateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true });
    else throw error;
  }
  if (!record || record.count > maximum) throw new AppError(429, "Too many requests. Please try again later.");
}
