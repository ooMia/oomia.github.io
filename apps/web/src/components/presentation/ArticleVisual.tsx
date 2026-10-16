import type { ArticleVisualModel } from "@/lib/presentation/articles";
export function ArticleVisual({
  visual,
  priority = false,
}: {
  visual: ArticleVisualModel;
  priority?: boolean;
}) {
  if (visual.src)
    return (
      <img
        src={visual.src}
        alt={visual.alt ?? ""}
        width={400}
        height={260}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? "sync" : "async"}
      />
    );
  return (
    <svg
      viewBox="0 0 400 260"
      aria-hidden="true"
      focusable="false"
      className={`article-visual visual-${visual.kind}`}
    >
      <rect
        width="400"
        height="260"
        rx="14"
        fill={
          visual.kind === "flow"
            ? "#d5e5b4"
            : visual.kind === "geometry"
              ? "#e7ded0"
              : "#dfe8eb"
        }
      />
      <text x="28" y="34" fontSize="9" letterSpacing="2.2" fill="#33423a">
        {visual.kind === "flow"
          ? "FROM A NOTE TO A PLACE"
          : visual.kind === "geometry"
            ? "SMALL PIECES / SHARED STRUCTURE"
            : "FIELD NOTES / WORK IN PROGRESS"}
      </text>
      {visual.kind === "flow" ? (
        <>
          <rect
            x="36"
            y="67"
            width="103"
            height="141"
            rx="12"
            fill="#f5f4ec"
            stroke="#536156"
            strokeWidth="1.6"
          />
          <path
            d="M111 67v28h28M60 170h55M60 185h37"
            fill="none"
            stroke="#536156"
            strokeWidth="1.3"
          />
          <text x="57" y="130" fontSize="25" fontWeight="600" fill="#33423a">
            .md
          </text>
          <path
            d="M139 136Q200 50 256 127m-15-7 15 7-3-17"
            fill="none"
            stroke="#33423a"
            strokeWidth="1.5"
          />
          <rect
            x="257"
            y="92"
            width="108"
            height="99"
            rx="12"
            fill="#f5f4ec"
            stroke="#536156"
            strokeWidth="1.6"
          />
          <path d="M257 113h108m-84 58h63" stroke="#536156" strokeWidth="1.2" />
          <text x="280" y="153" fontSize="21" fill="#33423a">
            www
          </text>
          <text x="190" y="229" fontSize="11" fill="#536156">
            write → publish
          </text>
        </>
      ) : visual.kind === "geometry" ? (
        <>
          <circle cx="101" cy="137" r="62" fill="#bccdaa" />
          <rect
            x="159"
            y="85"
            width="145"
            height="120"
            rx="18"
            transform="rotate(-12 231 145)"
            fill="none"
            stroke="#57665d"
            strokeWidth="1.5"
          />
          <circle cx="312" cy="80" r="17" fill="#f5f4ec" />
          <path d="M84 200h230" stroke="#57665d" />
          <text x="27" y="235" fontSize="12" fill="#33423a">
            {visual.keyword}
          </text>
        </>
      ) : (
        <>
          <text
            x="27"
            y="146"
            fontFamily="Georgia,serif"
            fontStyle="italic"
            fontSize="40"
            fill="#33423a"
          >
            {visual.keyword.length > 17
              ? visual.keyword.slice(0, 16) + "…"
              : visual.keyword}
          </text>
          <path d="M27 183h345" stroke="#81928a" />
          <text x="27" y="212" fontSize="10" letterSpacing="1.4" fill="#536156">
            IDEAS / TOOLS / SYSTEMS
          </text>
        </>
      )}
    </svg>
  );
}
