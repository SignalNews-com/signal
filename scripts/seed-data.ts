import mongoose from "mongoose";
import { User, Category, Tag, Article, AuditLog, DailyView } from "../src/models";
import { hashPassword } from "../src/lib/security";
import { slugify } from "../src/lib/validation";
import type { Status } from "../src/lib/permissions";
export const seedPassword = "Development-only!2026";
export async function seedDevelopmentData() {
  if (process.env.NODE_ENV === "production") throw new Error("Development seed is disabled in production");
  const dbName = mongoose.connection.name;
  if (!/(?:_dev|_test)$/.test(dbName)) throw new Error("Seed requires a database name ending in _dev or _test");
  if (await User.countDocuments() || await Article.countDocuments()) throw new Error("Seed requires an empty database. Existing data was left unchanged.");
  const passwordHash = await hashPassword(seedPassword);
  const people = await User.create([{ name: "Demo Editor", email: "admin@example.test", role: "ADMIN" as const, passwordHash }, ...["Maya Chen", "Alex Morgan", "Jordan Silva"].map((name, i) => ({ name, email: `writer${i + 1}@example.test`, role: "WRITER" as const, passwordHash, bio: "Development sample profile. Replace with a real writer biography before publication." }))]);
  const categories = await Category.create(["Technology", "AI", "Software", "Programming", "Gadgets", "Mobile", "Gaming", "Cybersecurity", "Startups", "Science"].map(name => ({ name, slug: slugify(name), description: `Reporting and perspective on ${name.toLowerCase()}.` })));
  const tags = await Tag.create(["OpenAI", "Apple", "Google", "Microsoft", "NVIDIA", "Android", "iPhone", "ChatGPT", "Windows", "Security"].map(name => ({ name, slug: slugify(name) })));
  const titles = ["Understanding the next chapter of artificial intelligence", "The quiet craft of building software that lasts", "Why repairability belongs in the gadget conversation", "A developer’s field guide to better code reviews", "Small teams, ambitious ideas: the startup playbook", "Making sense of the modern cybersecurity landscape", "What thoughtful mobile design can teach us", "Inside the systems that make multiplayer games work", "Open standards and the future of connected devices", "From experiment to insight: a look at applied science", "A practical introduction to responsible AI evaluation", "Beyond the launch: maintaining a software product", "The design decisions behind everyday technology", "Building a more accessible digital world", "How local-first tools change the way we work"];
  const states: Status[] = ["PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "DRAFT", "DRAFT", "SUBMITTED", "SUBMITTED", "APPROVED", "REJECTED", "REJECTED"];
  for (let i = 0; i < titles.length; i++) {
    const author = people[1 + i % 3]; const status = states[i]; const date = new Date(Date.now() - (i + 1) * 86400000);
    const article = await Article.create({ title: titles[i], slug: slugify(titles[i]), excerpt: "Development sample: an editorial example for exploring the SIGNAL publishing workflow. This is not a report of a current event.", content: `<p><strong>Development sample article.</strong> This original example exists to demonstrate the publishing system and its typography. It does not claim to report a current news event.</p><h2>A useful starting point</h2><p>Technology becomes easier to understand when we look beyond individual announcements. The decisions that shape a product include how it is maintained, who can use it, and what trade-offs its designers have made.</p><blockquote><p>A good question can be more useful than an immediate answer.</p></blockquote><h2>Questions worth asking</h2><ul><li>What problem does this technology address?</li><li>How can its claims be verified?</li><li>What limitations should readers understand?</li></ul><p>Before publishing real reporting, replace this sample with researched writing, verify sources, and send it through editorial review.</p>`, category: categories[i % categories.length]._id, tags: [tags[i % tags.length]._id], author: author._id, status, featured: i === 0, views: status === "PUBLISHED" ? (i + 1) * 120 : 0, submittedAt: status !== "DRAFT" ? date : undefined, approvedAt: ["APPROVED", "PUBLISHED"].includes(status) ? date : undefined, publishedAt: status === "PUBLISHED" ? date : undefined, rejectedAt: status === "REJECTED" ? date : undefined, rejectionReason: status === "REJECTED" ? "Add primary sources and make the introduction more specific before resubmitting." : "", createdAt: date, updatedAt: date });
    const events = [{ actorId: author._id, actorRole: "WRITER", articleId: article._id, action: "ARTICLE_CREATED", message: "Development seed example", createdAt: date }];
    if (status !== "DRAFT") events.push({ actorId: author._id, actorRole: "WRITER", articleId: article._id, action: "ARTICLE_SUBMITTED", message: "Development seed example", createdAt: date });
    if (status === "REJECTED") events.push({ actorId: people[0]._id, actorRole: "ADMIN", articleId: article._id, action: "ARTICLE_REJECTED", message: article.rejectionReason, createdAt: date });
    if (["APPROVED", "PUBLISHED"].includes(status)) events.push({ actorId: people[0]._id, actorRole: "ADMIN", articleId: article._id, action: "ARTICLE_APPROVED", message: "Development seed example", createdAt: date });
    if (status === "PUBLISHED") { events.push({ actorId: people[0]._id, actorRole: "ADMIN", articleId: article._id, action: "ARTICLE_PUBLISHED", message: "Development seed example", createdAt: date }); await DailyView.create({ article: article._id, day: date.toISOString().slice(0, 10), views: article.views }); }
    await AuditLog.insertMany(events);
  }
  return people;
}
