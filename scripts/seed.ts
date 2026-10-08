import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import { seedDevelopmentData } from "./seed-data";
async function main() { loadEnvConfig(process.cwd()); await connectDb(); await seedDevelopmentData(); console.log("Development sample data created. Credentials are documented in README.md; never use these accounts in production."); }
main().catch(error => { console.error(error instanceof Error && error.message.startsWith("Seed") ? error.message : "Seed failed. Check the database configuration and development database name."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
