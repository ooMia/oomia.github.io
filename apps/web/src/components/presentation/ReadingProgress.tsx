import type { TOCItemType } from "fumadocs-core/toc";
import type { RefObject } from "react";

import { useActiveAnchor } from "fumadocs-core/toc";
import { useEffect, useState } from "react";

interface ReadingProgressProps {
  bodyRef: RefObject<HTMLDivElement | null>;
  items: TOCItemType[];
  locale: "ko" | "en";
}

export function ReadingProgress({
  bodyRef,
  items,
  locale,
}: ReadingProgressProps) {
  const anchor = useActiveAnchor();
  const [position, setPosition] = useState({ progress: 0, reading: false });
  const current = items.find((item) => item.url === `#${anchor}`);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let frame = 0;
    let disposed = false;
    const update = () => {
      frame = 0;
      const rect = body.getBoundingClientRect();
      const offset = 88;
      // Header/footer are excluded. Completion means the body bottom is visible.
      const span = Math.max(1, rect.height - window.innerHeight + offset);
      const progress = Math.round(
        Math.max(0, Math.min(1, (offset - rect.top) / span)) * 100
      );
      const reading = rect.top < offset && rect.bottom > offset;
      setPosition((previous) =>
        previous.progress === progress && previous.reading === reading
          ? previous
          : { progress, reading }
      );
    };
    const schedule = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [bodyRef]);

  return (
    <>
      <div
        className="article-reading-meter"
        role="progressbar"
        aria-label={
          locale === "en" ? "Article reading progress" : "글 읽기 진행률"
        }
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position.progress}
        aria-valuetext={`${position.progress}%`}
        data-reading-progress
      >
        <span style={{ transform: `scaleX(${position.progress / 100})` }} />
      </div>
      <div
        className="article-reading-label"
        data-reading={position.reading ? "active" : "idle"}
        aria-hidden="true"
      >
        <span className="article-reading-current">
          {current?.title ?? (locale === "en" ? "Article" : "이 글")}
        </span>
        <span className="article-reading-percent">{position.progress}%</span>
      </div>
    </>
  );
}
