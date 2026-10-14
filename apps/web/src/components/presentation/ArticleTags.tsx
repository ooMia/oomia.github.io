import { useEffect, useId, useRef, useState } from "react";

import type { SiteLocale } from "@/lib/presentation/locale";
export function ArticleTags({
  tags,
  homeUrl,
  locale = "ko",
}: {
  tags: readonly string[];
  homeUrl: string;
  locale?: SiteLocale;
}) {
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    rail = useRef<HTMLUListElement>(null),
    more = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(tags.length),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const ul = rail.current;
    if (!ul) return;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      const items = [...ul.querySelectorAll<HTMLElement>("[data-fold-tag]")];
      items.forEach((x) => (x.style.display = ""));
      const gap = parseFloat(getComputedStyle(ul).gap) || 6;
      const widths = items.map((x) => x.getBoundingClientRect().width);
      const available = ul.clientWidth;
      let count = tags.length;
      let width =
        widths.reduce((a, b) => a + b, 0) +
        Math.max(0, widths.length - 1) * gap;
      if (width > available) {
        while (count > 0) {
          count--;
          width =
            widths.slice(0, count).reduce((a, b) => a + b, 0) +
            count * gap +
            34;
          if (width <= available) break;
        }
      }
      items.forEach((x, i) => (x.style.display = i < count ? "" : "none"));
      setVisible(count);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(ul);
    void document.fonts.ready.then(fit);
    fit();
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [tags]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    const menu = root.current?.querySelector<HTMLElement>(".tag-overflow");
    if (menu && root.current) {
      const rect = root.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const higher = below < Math.min(menu.scrollHeight, 240) && above > below;
      menu.style.top = higher ? "auto" : "calc(100% + 7px)";
      menu.style.bottom = higher ? "calc(100% + 7px)" : "auto";
      menu.style.maxHeight =
        Math.max(60, Math.min(240, higher ? above : below)) + "px";
      menu.dataset["placement"] = higher ? "above" : "below";
    }
    root.current?.querySelector<HTMLAnchorElement>(".tag-overflow a")?.focus();
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  if (!tags.length) return null;
  const href = (tag: string) =>
    `${homeUrl}?tag=${encodeURIComponent(tag)}#recent-articles`;
  return (
    <div
      ref={root}
      className="tag-collection"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
          more.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <ul
        className="tags"
        aria-label={locale === "en" ? "Tags" : "태그"}
        ref={rail}
      >
        {tags.map((tag) => (
          <li className="tag" data-fold-tag key={tag}>
            <a href={href(tag)}>#{tag}</a>
          </li>
        ))}
        <li className="tag tag-expander" hidden={visible === tags.length}>
          <button
            ref={more}
            type="button"
            className="tag-more"
            aria-label={
              locale === "en"
                ? `Show all ${tags.length} tags`
                : `태그 ${tags.length}개 모두 보기`
            }
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            +{tags.length - visible}
          </button>
        </li>
      </ul>
      <div
        id={id}
        className="tag-overflow"
        data-scroll-surface
        hidden={!open}
        role="group"
        aria-label={locale === "en" ? "All tags" : "모든 태그"}
      >
        {tags.map((tag) => (
          <a href={href(tag)} key={tag}>
            #{tag}
          </a>
        ))}
      </div>
    </div>
  );
}
