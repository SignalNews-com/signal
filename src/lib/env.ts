import { z } from "zod";
export const siteUrl = () => z.url().parse(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
export function authSecret() {
  const secret = requiredEnv("AUTH_SECRET");
  if (secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return secret;
}
export const databaseConfigured = () => Boolean(process.env.MONGODB_URI?.trim());
