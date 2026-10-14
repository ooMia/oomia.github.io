import type { TOCItemType } from "fumadocs-core/toc";
import type { MouseEvent } from "react";

import { TOCItem, useActiveAnchor } from "fumadocs-core/toc";
import { useEffect, useRef } from "react";

import { Icon } from "./Icon";

interface ArticleTOCProps {
  items: TOCItemType[];
  variant?: "compact" | "rail";
  locale?: "ko" | "en";
  contentLanguage?: "ko" | "en";
}

export function ArticleTOC({
  items,
  variant = "compact",
  locale = "ko",
  contentLanguage = locale,
}: ArticleTOCProps) {
  const active = useActiveAnchor();
  const details = useRef<HTMLDetailsElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const current = items.find((item) => item.url === `#${active}`);
  const minDepth = Math.min(...items.map((item) => item.depth));

  // Core owns active heading detection; Site only moves its presentation marker.
  useEffect(() => {
    if (variant !== "rail" || !list.current || !indicator.current) return;
    const update = () => {
      const item = list.current?.querySelector<HTMLElement>(
        '[data-active="true"]'
      );
      const marker = indicator.current;
      if (!marker) return;
      marker.style.opacity = item ? "1" : "0";
      if (item) {
        marker.style.height = `${Math.max(12, item.offsetHeight - 16)}px`;
        marker.style.transform = `translateY(${item.offsetTop + 8}px)`;
      }
    };
    let disposed = false;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list.current);
    void document.fonts.ready.then(() => {
      if (!disposed) update();
    });
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [active, variant]);

  if (items.length === 0) return null;

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const heading = document.getElementById(href.slice(1));
    if (!heading) return;
    event.preventDefault();
    if (details.current) details.current.open = false;
    window.history.pushState(null, "", href);
    heading.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    if (!heading.hasAttribute("tabindex"))
      heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  const outline = (
    <div className="article-toc-outline" data-scroll-surface>
      {variant === "rail" ? (
        <span
          ref={indicator}
          className="article-toc-indicator"
          aria-hidden="true"
        />
      ) : null}
      <ol ref={list} className="article-toc-list">
        {items.map((item) => (
          <li key={item.url}>
            <TOCItem
              href={item.url}
              lang={contentLanguage}
              aria-current={item.url === `#${active}` ? "location" : undefined}
              style={{
                paddingInlineStart: `${(item.depth - minDepth) * 0.75}rem`,
              }}
              className="article-toc-link"
              onClick={(event) => navigate(event, item.url)}
              autoScroll={false}
            >
              {item.title}
            </TOCItem>
          </li>
        ))}
      </ol>
    </div>
  );

  if (variant === "rail")
    return (
      <aside
        className="article-rail"
        aria-label={locale === "en" ? "Reading guide" : "읽기 안내"}
      >
        <nav aria-label={locale === "en" ? "Article contents" : "글 목차"}>
          <p className="article-rail-title">ON THIS PAGE</p>
          {outline}
        </nav>
      </aside>
    );

  return (
    <nav
      aria-label={locale === "en" ? "Article contents" : "글 목차"}
      className="article-compact-toc"
      data-scroll-surface
    >
      <details
        ref={details}
        onKeyDown={(event) => {
          if (event.key === "Escape" && details.current?.open) {
            details.current.open = false;
            details.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>
          <Icon name="book" />
          <span>{locale === "en" ? "On this page" : "목차"}</span>
          <span
            className="article-toc-current"
            lang={current ? contentLanguage : locale}
          >
            {current?.title ??
              (locale === "en"
                ? "Follow your reading"
                : "현재 위치를 따라갑니다")}
          </span>
          <span className="article-toc-chevron" aria-hidden="true">
            ⌄
          </span>
        </summary>
        {outline}
      </details>
    </nav>
  );
}
