import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
// Public pages are cached (ISR + data cache). Call after anything readers can see changes.
export const publicTags = { articles: "public-articles", taxonomy: "public-taxonomy", people: "public-people" } as const;
export function refreshPublic(...tags: (typeof publicTags)[keyof typeof publicTags][]) {
  // expire: 0 so the next visitor gets fresh content instead of one stale render (e.g. an unpublished story).
  for (const tag of tags.length ? tags : Object.values(publicTags)) revalidateTag(tag, { expire: 0 });
  revalidatePath("/", "layout");
}
