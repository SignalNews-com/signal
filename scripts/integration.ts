import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { chromium } from "@playwright/test";
import { connectDb } from "../src/lib/db";
import * as models from "../src/models";
import { seedDevelopmentData, seedPassword } from "./seed-data";
import { geographyChecks, type RequestOptions } from "./geography-checks";
type Result = { id?: string; article?: { revision: number; status: string; title: string; author: { _id: string } }; counted?: boolean; error?: string };
const port = 3107; const origin = `http://localhost:${port}`;
let server: ChildProcess | undefined; let replica: MongoMemoryReplSet | undefined;
async function request(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${origin}${path}`, { method: options.method || "GET", headers: { "Content-Type": "application/json", Origin: options.origin || origin, ...(options.cookie ? { Cookie: options.cookie } : {}), "User-Agent": "SignalIntegrationTest", ...options.headers }, body: options.body === undefined ? undefined : JSON.stringify(options.body), redirect: "manual" });
  // With a loading boundary, Next may already have started a 200 stream before notFound().
  if (options.expected === 404 && response.status === 200 && path.startsWith("/article/")) {
    const html = await response.clone().text();
    assert.ok(html.includes("NEXT_HTTP_ERROR_FALLBACK;404") && html.includes("The page may have moved or is not available."), "Expected streamed not-found page");
  } else if (options.expected === 307 && response.status === 200 && path.startsWith("/admin")) {
    assert.match(await response.clone().text(), /NEXT_REDIRECT;replace;\/(login|writer);307;/, "Expected streamed auth redirect");
  } else assert.equal(response.status, options.expected || 200, `${path}: ${response.status}`);
  return response;
}
async function login(email: string) { const response = await request("/api/auth/login", { method: "POST", body: { email, password: seedPassword, role: "ADMIN" } }); const cookie = response.headers.getSetCookie().find(c => c.startsWith("__Host-signal-session=")); assert.ok(cookie); assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); return cookie.split(";")[0]; }
async function main() {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger", dbName: "signal_test" } });
  process.env.ANALYTICS_ENABLED = "true"; process.env.ANALYTICS_CONSENT_MODE = "required";
  process.env.ANALYTICS_GEO_PROVIDER = "vercel"; process.env.VERCEL = "1"; // Simulated trusted edge, isolated test process only.
  process.env.MONGODB_URI = replica.getUri("signal_test"); process.env.AUTH_SECRET = randomBytes(32).toString("hex"); process.env.NEXT_PUBLIC_SITE_URL = origin;
  await connectDb(); for (const model of Object.values(models)) await model.createIndexes(); const people = await seedDevelopmentData();
  // Public pages are cached (ISR + data cache); drop entries left by earlier runs against a different database.
  for (const dir of [".next/cache/fetch-cache", ".next/server/route-cache"]) await rm(dir, { recursive: true, force: true });
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "production" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", chunk => { const text = String(chunk); if (text.includes("Ready")) console.log("Production server ready"); });
  server.stderr?.on("data", chunk => process.stderr.write(String(chunk)));
  let ready = false; for (let i = 0; i < 60; i++) { try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch { /* Server booting. */ } await pause(500); } assert.ok(ready, "Production server did not start");
  const writer = await login("writer1@example.test"); const other = await login("writer2@example.test"); const admin = await login("admin@example.test");
  const category = await models.Category.findOne({ slug: "technology" }); assert.ok(category);
  const data = { title: "Integration test: a secure editorial workflow", excerpt: "A complete test of draft, submission, review, and publication through real HTTP endpoints.", content: '<h2>A test story</h2><p>' + "Original reporting needs thoughtful review and careful verification. ".repeat(4) + '</p><script>window.pwned=true</script>', category: category.id, tags: [], role: "ADMIN", status: "PUBLISHED", author: people[2].id };
  const create = await request("/api/articles", { method: "POST", cookie: writer, body: data, expected: 201 }); const { id } = await create.json() as Result; assert.ok(id);
  const stored = await models.Article.findById(id); assert.ok(stored); assert.equal(stored.status, "DRAFT"); assert.equal(stored.author.toString(), people[1].id); assert.ok(!stored.content.includes("<script"));
  await request(`/api/articles/${id}`, { cookie: other, expected: 403 });
  await request(`/api/articles/${id}`, { method: "PATCH", cookie: other, body: { ...data, revision: 1 }, expected: 403 });
  await request("/api/admin/writers", { method: "POST", cookie: writer, body: { name: "Bad writer", email: "bad@example.test", password: seedPassword }, expected: 403 });
  await request(`/api/articles/${id}/workflow`, { method: "POST", cookie: writer, body: { action: "publish", revision: 1 }, expected: 403 });
  await request(`/article/${stored.slug}`, { expected: 404 });
  const dashboardResponse = await request("/admin", { cookie: writer, expected: 307 }); assert.ok(dashboardResponse.headers.get("location") === "/writer" || (await dashboardResponse.text()).includes("NEXT_REDIRECT;replace;/writer;307;"));
  await request(`/api/articles/${id}`, { method: "PATCH", cookie: writer, body: { ...data, revision: 1 }, origin: "https://evil.test", expected: 403 });
  console.log("PASS: ownership, role injection, admin API, unpublished content, CSRF and HTML sanitization");
  let revision = 1;
  async function transition(action: string, cookie: string, reason = "") { await request(`/api/articles/${id}/workflow`, { method: "POST", cookie, body: { action, revision, reason } }); revision++; }
  await transition("submit", writer);
  await request(`/api/articles/${id}`, { method: "PATCH", cookie: writer, body: { ...data, revision }, expected: 409 });
  await transition("reject", admin, "Please improve the supporting source material.");
  await request(`/api/articles/${id}`, { method: "PATCH", cookie: writer, body: { ...data, revision } }); revision++;
  await transition("submit", writer); await transition("approve", admin); await transition("publish", admin); await transition("feature", admin);
  const publicResponse = await request(`/article/${stored.slug}`); const html = await publicResponse.text(); assert.ok(html.includes("application/ld+json")); assert.ok(!html.includes("writer1@example.test")); assert.ok(!html.includes("window.pwned=true"));
  const sitemap = await (await request("/sitemap.xml")).text(); assert.ok(sitemap.includes(stored.slug));
  const search = await (await request("/search?q=Integration")).text(); assert.ok(search.includes(data.title));
  await request(`/api/articles/${id}`, { method: "PATCH", cookie: admin, body: { ...data, revision: revision - 1 }, expected: 409 });
  const consentCookie = "signal-analytics-consent=granted";
  const first = await request(`/api/views/${id}`, { method: "POST", body: {}, cookie: consentCookie }); assert.equal((await first.json() as Result).counted, true); const readerCookie = first.headers.getSetCookie()[0].split(";")[0]; const second = await request(`/api/views/${id}`, { method: "POST", body: {}, cookie: `${readerCookie}; ${consentCookie}` }); assert.equal((await second.json() as Result).counted, false); assert.equal((await models.Article.findById(id))?.views, 1);
  await geographyChecks(request, { admin, writer, other }, id, people[1].id, people[2].id);
  const history = await models.AuditLog.find({ articleId: id }); assert.ok(history.some(h => h.action === "ARTICLE_RESUBMITTED")); assert.ok(history.some(h => h.action === "ARTICLE_REJECTED"));
  await request(`/api/admin/categories/${category.id}`, { method: "DELETE", cookie: admin, expected: 409 });
  await transition("unpublish", admin); await request(`/article/${stored.slug}`, { expected: 404 }); await transition("delete", admin); await transition("restore", admin);
  console.log("PASS: full review workflow, stale update prevention, search, SEO, view deduplication, history, safe deletion and restore");
  const createdWriter = await request("/api/admin/writers", { method: "POST", cookie: admin, body: { name: "New Writer", email: "new@example.test", password: seedPassword, role: "ADMIN" }, expected: 201 }); const newId = (await createdWriter.json() as Result).id; assert.equal((await models.User.findById(newId))?.role, "WRITER");
  await request(`/api/admin/writers/${people[2].id}`, { method: "PATCH", cookie: admin, body: { isActive: false } }); await request(`/api/articles/${id}`, { cookie: other, expected: 401 }); await request("/api/auth/login", { method: "POST", body: { email: "writer2@example.test", password: seedPassword }, expected: 401 });
  console.log("PASS: writer creation cannot escalate privileges; deactivation revokes sessions and denies login");
  await mkdir(".runtime", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin); await page.screenshot({ path: ".runtime/home-desktop.png", fullPage: true });
    await page.goto(`${origin}/login`); await page.getByLabel("Email address").fill("admin@example.test"); await page.getByLabel("Password", { exact: true }).fill(seedPassword); await page.getByRole("button", { name: "Sign in to newsroom" }).click(); await page.waitForURL("**/admin"); await page.getByRole("heading", { name: "Editorial overview" }).waitFor();
    await page.screenshot({ path: ".runtime/admin-desktop.png", fullPage: true });
    for (const route of ["/admin/writers", `/admin/writers/${people[1].id}`, "/admin/categories", "/admin/tags", "/admin/review", "/admin/analytics", "/admin/analytics/geography", "/admin/activity", "/admin/settings"]) { await page.goto(`${origin}${route}`); assert.ok(!await page.getByRole("heading", { name: "We couldn't load this page." }).count(), route); }
    await page.goto(`${origin}/admin/analytics/geography`);
    await page.getByRole("group", { name: "World map of recorded article page views" }).waitFor();
    const sriLanka = page.getByRole("button", { name: /^Sri Lanka:/ });
    await sriLanka.focus(); await sriLanka.press("Enter"); await page.waitForURL("**/admin/analytics/geography?country=LK");
    await page.getByRole("heading", { name: /Sri Lanka ·/ }).waitFor();
    await page.screenshot({ path: ".runtime/geography-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: ".runtime/geography-mobile.png", fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Geography mobile overflow");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/admin/articles/new`); await page.getByLabel("Article title", { exact: true }).fill("A browser-created article with real content"); await page.getByLabel("Excerpt", { exact: true }).fill("This article was created through the browser during full-stack verification."); await page.getByLabel("Category", { exact: true }).selectOption(category.id); await page.getByRole("textbox", { name: "Article content" }).fill("This content was typed into the rich text editor during the full-stack browser test. ".repeat(4)); await page.getByRole("button", { name: "Save draft", exact: true }).click(); await page.waitForURL("**/edit"); await page.getByText("All changes saved", { exact: true }).waitFor();
    await page.screenshot({ path: ".runtime/editor-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(origin); await page.screenshot({ path: ".runtime/home-mobile.png", fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Public mobile overflow");
    await page.goto(`${origin}/admin`); await page.screenshot({ path: ".runtime/admin-mobile.png", fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Admin mobile overflow");
    const readerContext = await browser.newContext({ userAgent: "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36", extraHTTPHeaders: { "x-vercel-ip-country": "LK" } });
    try {
      const readerPage = await readerContext.newPage(); readerPage.on("pageerror", error => errors.push(error.message));
      await readerPage.goto(`${origin}/privacy`);
      await readerPage.getByRole("button", { name: "Allow article analytics" }).click();
      await readerPage.getByText("Article analytics allowed.", { exact: false }).waitFor();
      const accepted = readerPage.waitForResponse(r => r.url().includes("/api/views/") && r.request().method() === "POST");
      // The tracker uses a keepalive fetch; Chromium crashes the page when Playwright reads such a body, so verify in the database.
      const foreign = await models.Article.findOne({ slug: "geo-foreign-fixture" }); const before = foreign!.views;
      await readerPage.goto(`${origin}/article/geo-foreign-fixture`);
      assert.equal((await accepted).status(), 200); assert.equal((await models.Article.findById(foreign!._id))?.views, before + 1);
      const repeated = readerPage.waitForResponse(r => r.url().includes("/api/views/") && r.request().method() === "POST");
      await readerPage.reload(); assert.equal((await repeated).status(), 200); assert.equal((await models.Article.findById(foreign!._id))?.views, before + 1);
      assert.equal((await models.DailyArticleCountryMetric.findOne({ article: foreign!._id, countryCode: "LK" }))?.pageViews, 1);
    } finally { await readerContext.close(); }
    assert.deepEqual(errors, []); console.log("PASS: browser login, admin pages, keyboard map selection, country drill-down, consent-to-collection flow, refresh deduplication, responsive screenshots and no browser exceptions");
  } finally { await browser.close(); }
  await request("/api/auth/logout", { method: "POST", cookie: writer }); await request(`/api/articles/${id}`, { cookie: writer, expected: 401 });
  console.log("PASS: logout revokes database session"); console.log("Integration suite passed. Temporary test database will be removed.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Integration failed"); process.exitCode = 1; }).finally(async () => { server?.kill(); await mongoose.disconnect(); await replica?.stop(); });
