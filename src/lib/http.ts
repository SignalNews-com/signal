import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, assert } from "./errors";
export async function jsonBody(request: Request) {
  assert(request.headers.get("content-type")?.includes("application/json"), 415, "Expected JSON request");
  const reader = request.body?.getReader();
  assert(reader, 400, "Request body is required");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 300000) { await reader.cancel(); throw new AppError(413, "Request is too large"); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; } catch { throw new AppError(400, "Invalid JSON"); }
}
export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Please check the highlighted fields", fields: error.flatten().fieldErrors }, { status: 400 });
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (typeof error === "object" && error && "code" in error && error.code === 11000) return NextResponse.json({ error: "That email or slug already exists. Please choose another." }, { status: 409 });
  // Do not log raw database errors: connection errors may contain credentials.
  console.error("Request failed", { type: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: "Unable to complete this request. Check the server configuration or try again." }, { status: 500 });
}
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
