type Position = "header" | "home-feed" | "article-top" | "article-middle" | "sidebar" | "article-bottom";
// Future ad providers belong here. Reserve space to limit layout shift.
export function AdSlot({ position }: { position: Position }) { return <aside className={`ad-slot ad-${position}`} aria-label="Advertisement placement"><span>ADVERTISEMENT</span><div>Space for what&apos;s next</div></aside>; }
