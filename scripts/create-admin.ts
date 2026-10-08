import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import { User } from "../src/models";
import { writerSchema } from "../src/lib/validation";
import { hashPassword } from "../src/lib/security";
async function main() { loadEnvConfig(process.cwd()); const data = writerSchema.parse({ name: process.env.BOOTSTRAP_ADMIN_NAME, email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD }); await connectDb(); if (await User.exists({ role: "ADMIN" })) throw new Error("Administrator already exists"); await User.create({ name: data.name, email: data.email, passwordHash: await hashPassword(data.password), role: "ADMIN" }); console.log("Initial administrator created. Clear BOOTSTRAP_ADMIN_PASSWORD from your environment."); }
main().catch(() => { console.error("Admin creation failed. Ensure no admin exists and configure BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD (12+ characters). No credentials were logged."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
