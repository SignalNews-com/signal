import type { Status } from "@/lib/permissions";
export type Taxonomy = { _id: string; name: string; slug: string; description: string; isActive: boolean };
export type Person = { _id: string; name: string; bio?: string; avatar?: string; email?: string; isActive?: boolean; lastLoginAt?: string; createdAt?: string };
export type CoverImage = { url: string; secureUrl: string; publicId: string; width: number; height: number; alt: string };
export type ArticleRecord = {
  _id: string; title: string; slug: string; excerpt: string; content: string; category: Taxonomy | null; tags: Taxonomy[]; author: Person;
  status: Status; featured: boolean; views: number; coverImage?: CoverImage; socialImage: string; seoTitle: string; seoDescription: string; canonicalUrl: string;
  sourceName: string; sourceUrl: string; rejectionReason?: string; submittedAt?: string; approvedAt?: string; rejectedAt?: string; publishedAt?: string; createdAt: string; updatedAt: string; deletedAt?: string; revision: number;
};
export type AuditRecord = { _id: string; action: string; message: string; actorId: Person; articleId?: { _id: string; title: string }; createdAt: string };
export type SearchParams = Record<string, string | string[] | undefined>;
export function serialize<T>(value: unknown): T { return JSON.parse(JSON.stringify(value)) as T; }
