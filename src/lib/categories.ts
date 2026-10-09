// The main navigation sections. Anything published outside these appears under "Others".
export const primaryCategories = [
  { slug: "ai", name: "AI", description: "Artificial intelligence, machine learning, and the companies building them." },
  { slug: "technology", name: "Technology", description: "The big shifts in technology, industry, and policy." },
  { slug: "software", name: "Software", description: "Apps, platforms, developer tools, and how software is made." },
  { slug: "gaming", name: "Gaming", description: "Games, consoles, PC gaming, and the business of play." },
  { slug: "gadgets", name: "Gadgets", description: "Phones, laptops, wearables, and the hardware in your life." },
  { slug: "cybersecurity", name: "Cybersecurity", description: "Threats, breaches, privacy, and how to stay safe online." },
] as const;
export const othersCategory = { slug: "others", name: "Others", description: "Science, startups, internet culture, and every story beyond our main sections." } as const;
export const primarySlugs: readonly string[] = primaryCategories.map(c => c.slug);
export const navLinks: readonly (readonly [string, string])[] = [["/latest", "Latest"], ...primaryCategories.map(c => [`/category/${c.slug}`, c.name] as const), [`/category/${othersCategory.slug}`, othersCategory.name]];
// Editor ordering: main sections first, Others last, remaining categories alphabetically in between.
export function sortCategories<T extends { slug: string; name: string }>(items: T[]) {
  const rank = (slug: string) => slug === othersCategory.slug ? primarySlugs.length + 1 : primarySlugs.includes(slug) ? primarySlugs.indexOf(slug) : primarySlugs.length;
  return items.toSorted((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));
}
