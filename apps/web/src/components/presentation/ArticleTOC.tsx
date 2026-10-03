import type { TOCItemType } from "fumadocs-core/toc";

import { TOCItem, useActiveAnchor } from "fumadocs-core/toc";
import { useRef } from "react";

export function ArticleTOC({ items }: { items: TOCItemType[] }) {
  const active = useActiveAnchor();
  const details = useRef<HTMLDetailsElement>(null);
  if (items.length === 0) return null;
  const current = items.find((item) => item.url === `#${active}`);
  const minDepth = Math.min(...items.map((item) => item.depth));

  return (
    <nav
      aria-label="글 목차"
      className="sticky top-14 z-30 mb-8 border-y bg-fd-background/95 backdrop-blur"
    >
      <details
        ref={details}
        className="relative"
        onKeyDown={(event) => {
          if (event.key === "Escape" && details.current?.open) {
            details.current.open = false;
            details.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary className="cursor-pointer py-3 text-sm">
          <span className="ml-2 text-fd-muted-foreground">목차</span>
          <span className="ml-3">{current?.title ?? "이 글의 내용"}</span>
        </summary>
        <ol className="absolute inset-x-0 top-full max-h-[min(60vh,24rem)] overflow-y-auto rounded-b-lg border bg-fd-popover p-3 shadow-lg">
          {items.map((item) => (
            <li key={item.url}>
              <TOCItem
                href={item.url}
                style={{
                  paddingInlineStart: `${0.75 + (item.depth - minDepth) * 0.75}rem`,
                }}
                className="block rounded-md px-3 py-2 text-sm text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-2 data-[active=true]:bg-fd-accent data-[active=true]:text-fd-foreground"
                onClick={() => {
                  if (details.current) details.current.open = false;
                }}
              >
                {item.title}
              </TOCItem>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
