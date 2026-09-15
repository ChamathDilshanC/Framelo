"use client";

import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface PortfolioCardData {
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  shareToken: string | null;
  authorUsername?: string | null;
  authorName?: string | null;
}

/**
 * The portfolio grid.
 *
 * Large visual cards, minimal chrome — a portfolio should read as a body of
 * work, not as a table of rows.
 *
 * Previews are the expensive part, so they are strictly rationed: a card shows
 * a static cover until it is both on screen and under the pointer, and only one
 * preview is ever live at a time.
 */
export function PortfolioGrid({ items }: { items: PortfolioCardData[] }) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line py-20 text-center">
        <p className="text-[13px] text-ink-muted">Nothing published yet.</p>
        <p className="mt-1 text-[11px] text-ink-subtle">
          Publish a project from the dashboard to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <PortfolioCard
          key={`${item.authorUsername ?? ""}/${item.slug}`}
          item={item}
          active={hovered === item.slug}
          onHover={(value) => setHovered(value ? item.slug : null)}
        />
      ))}
    </div>
  );
}

function PortfolioCard({
  item,
  active,
  onHover,
}: {
  item: PortfolioCardData;
  active: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const ref = React.useRef<HTMLAnchorElement>(null);
  const visible = useOnScreen(ref);

  const href = item.shareToken ? `/share/${item.shareToken}` : "#";

  return (
    <Link
      ref={ref}
      href={href}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className="group block"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200 group-hover:border-line-strong">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt=""
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 ease-out-quint",
              active && visible ? "scale-[1.04]" : "scale-100",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-raised">
            <span className="text-[11px] text-ink-subtle">No cover</span>
          </div>
        )}

        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent transition-opacity duration-300",
            active ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      <div className="mt-2.5 space-y-0.5">
        <h3 className="truncate text-[13px] font-medium text-ink">{item.title}</h3>
        {item.description ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
            {item.description}
          </p>
        ) : null}
        {item.authorName || item.authorUsername ? (
          <p className="text-[10px] text-ink-subtle">
            {item.authorName ?? item.authorUsername}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Whether an element is in the viewport.
 *
 * `IntersectionObserver` rather than scroll maths: a long portfolio should cost
 * nothing for the cards nobody has scrolled to.
 */
function useOnScreen(ref: React.RefObject<Element | null>): boolean {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}
