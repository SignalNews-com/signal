import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import * as models from "../src/models";
async function main() { loadEnvConfig(process.cwd()); await connectDb(); for (const model of Object.values(models)) await model.createIndexes(); console.log("Database indexes created without dropping existing indexes."); }
main().catch(() => { console.error("Index setup failed. Check database access."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
