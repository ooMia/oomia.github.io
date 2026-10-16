import type { KeyboardEvent, ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import {
  type HomeStory,
  normalizeTag,
  type TagIndex,
} from "@/lib/presentation/articles";
import { localeDate, type SiteLocale } from "@/lib/presentation/locale";

import { ArticleTags } from "./ArticleTags";
import { ArticleVisual } from "./ArticleVisual";
import { Icon } from "./Icon";
import { SiteFooter, SiteFrame } from "./SiteFrame";
import "./home.css";

export interface HomeFrameProps {
  pathname: string;
  homeUrl: string;
  stories: readonly HomeStory[];
  tagIndex: TagIndex;
  locale?: "ko" | "en";
  localeUrl?: string;
  children?: ReactNode;
}

// Metadata backticks keep the same inline-code meaning as article prose.
function metadataText(text: string) {
  return text
    .split(/(`[^`]+`)/g)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        part
      )
    );
}

function StoryMetadata({
  story,
  locale,
}: {
  story: HomeStory;
  locale: SiteLocale;
}) {
  return (
    <div className="home-story-meta">
      {story.publishedAt && (
        <time dateTime={story.publishedAt}>
          {localeDate(story.publishedAt, locale)}
        </time>
      )}
      <span>{story.readingMinutes} min read</span>
    </div>
  );
}

export function HomeFrame({
  pathname,
  homeUrl,
  stories,
  tagIndex,
  locale = "ko",
  localeUrl,
  children,
}: HomeFrameProps) {
  const [selectedTag, setSelectedTag] = useState("");
  const picker = useRef<HTMLDetailsElement>(null);
  const recent = useRef<HTMLHeadingElement>(null);
  const text = (ko: string, en: string) => (locale === "en" ? en : ko);

  useEffect(() => {
    // Static SSR and the first client render match; the URL is applied after hydration.
    const restoreFilter = () => {
      const tag = normalizeTag(
        new URLSearchParams(window.location.search).get("tag") ?? ""
      );
      setSelectedTag(Object.hasOwn(tagIndex.counts, tag) ? tag : "");
    };
    const closeOutside = (event: MouseEvent) => {
      if (
        picker.current?.open &&
        event.target instanceof Node &&
        !picker.current.contains(event.target)
      )
        picker.current.open = false;
    };
    restoreFilter();
    window.addEventListener("popstate", restoreFilter);
    document.addEventListener("click", closeOutside);
    return () => {
      window.removeEventListener("popstate", restoreFilter);
      document.removeEventListener("click", closeOutside);
    };
  }, [tagIndex]);

  function selectTag(tag: string) {
    const next = normalizeTag(tag);
    setSelectedTag(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("tag", next);
    else url.searchParams.delete("tag");
    window.history.replaceState(null, "", url);
    if (picker.current) picker.current.open = false;
    picker.current?.querySelector("summary")?.focus({ preventScroll: true });
    // Filtering adds/removes the featured section; measure after React commits it.
    window.requestAnimationFrame(() =>
      recent.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      })
    );
  }

  function pickerKeys(event: KeyboardEvent<HTMLDetailsElement>) {
    if (!picker.current) return;
    const summary = picker.current.querySelector("summary");
    const buttons = Array.from(
      picker.current.querySelectorAll<HTMLButtonElement>(
        ".home-tag-pane button"
      )
    );
    if (event.key === "Escape" && picker.current.open) {
      event.preventDefault();
      picker.current.open = false;
      summary?.focus({ preventScroll: true });
      return;
    }
    if (event.target === summary && event.key === "ArrowDown") {
      event.preventDefault();
      picker.current.open = true;
      buttons[0]?.focus();
      return;
    }
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    }
  }

  const featured = stories[0];
  const originalCount = stories.filter(
    (story) => (story.language ?? "ko") === "ko"
  ).length;
  const translatedCount = stories.length - originalCount;
  const listed = selectedTag
    ? stories.filter((story) => story.tags.includes(selectedTag))
    : stories.slice(1);

  return (
    <SiteFrame
      pathname={pathname}
      homeUrl={homeUrl}
      locale={locale}
      {...(localeUrl ? { localeUrl } : {})}
    >
      <div id="homepage" className="home-page">
        <header id="main" tabIndex={-1} className="home-hero">
          <div className="home-hero-top">
            <p className="home-eyebrow">Software / Writing / Experiments</p>
            <span className="home-edition">FIELD NOTES</span>
          </div>
          <h1>
            <span>Ideas into</span>
            <br />
            <em>systems.</em>
          </h1>
          <div className="home-hero-bottom">
            <a className="home-explore" href="#recent-articles">
              Explore the notes <Icon name="arrow-right" />
            </a>
            <span className="home-folio" aria-hidden="true">
              {String(stories.length).padStart(2, "0")} NOTES · ALWAYS IN
              PROGRESS
            </span>
          </div>
        </header>

        {locale === "en" && stories.length > 0 && (
          <p className="home-language-notice" role="note">
            <Icon name="languages" />
            {translatedCount === 0
              ? "Articles are shown in the Korean original. English translations are not available yet."
              : originalCount > 0
                ? `${translatedCount} of ${stories.length} articles have English translations. Other articles show the Korean original.`
                : "English translations from Korean."}
          </p>
        )}

        {featured && !selectedTag && (
          <section
            className="home-featured"
            aria-label={text("최근 Article", "Latest article")}
          >
            <div className="home-featured-copy">
              <p className="home-featured-label">
                {text("최근 Article", "Latest article")}
              </p>
              <h2 className="home-story-title" lang={featured.language ?? "ko"}>
                <a href={featured.url}>{metadataText(featured.title)}</a>
              </h2>
              <p
                className="home-story-description"
                lang={featured.language ?? "ko"}
              >
                {metadataText(featured.description)}
              </p>
              <StoryMetadata story={featured} locale={locale} />
              <ArticleTags
                tags={featured.tags}
                homeUrl={homeUrl}
                locale={locale}
              />
            </div>
            <a
              className="home-cover"
              lang={featured.language ?? "ko"}
              href={featured.url}
              aria-label={featured.title}
            >
              <ArticleVisual visual={featured.visual} priority />
            </a>
          </section>
        )}

        <div className="home-below">
          <section className="home-latest" aria-labelledby="recent-articles">
            <div className="home-section-heading">
              <h2 id="recent-articles" ref={recent} tabIndex={-1}>
                {selectedTag
                  ? `#${selectedTag}`
                  : text("최근 글", "Recent notes")}
              </h2>
              <span aria-live="polite">
                {listed.length} {text("개의 글", "articles")}
              </span>
            </div>
            <div className="home-filter-bar">
              <details
                ref={picker}
                className="home-tag-picker"
                onKeyDown={pickerKeys}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false;
                }}
              >
                <summary>
                  <span>
                    {selectedTag
                      ? `#${selectedTag}`
                      : text("모든 태그", "All tags")}
                  </span>
                  <Icon name="chevron-down" />
                </summary>
                <div
                  className="home-tag-pane"
                  role="group"
                  aria-label={text(
                    "태그별 글 모아보기",
                    "Browse articles by tag"
                  )}
                  data-scroll-surface
                >
                  <button
                    type="button"
                    onClick={() => selectTag("")}
                    aria-pressed={!selectedTag}
                  >
                    <span>{text("전체 글", "All articles")}</span>
                    <span>({stories.length})</span>
                  </button>
                  {tagIndex.order.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => selectTag(tag)}
                      aria-pressed={selectedTag === tag}
                    >
                      <span>#{tag}</span>
                      <span>({tagIndex.counts[tag]})</span>
                    </button>
                  ))}
                </div>
              </details>
              {selectedTag ? (
                <button
                  className="home-filter-clear"
                  type="button"
                  onClick={() => selectTag("")}
                >
                  {text("전체 글 보기", "All articles")}
                  <Icon name="arrow-right" />
                </button>
              ) : (
                <p className="home-filter-hint">
                  {text("주제별로 읽어보세요.", "Find a thread to follow.")}
                </p>
              )}
            </div>
            <ul className="home-stories">
              {listed.map((story) => (
                <li
                  className="home-story"
                  key={story.id}
                  data-article-id={story.id}
                >
                  <span className="home-story-number" aria-hidden="true">
                    {String(stories.indexOf(story) + 1).padStart(2, "0")}
                  </span>
                  <div className="home-story-copy">
                    <h3
                      className="home-story-title"
                      lang={story.language ?? "ko"}
                    >
                      <a href={story.url}>{metadataText(story.title)}</a>
                    </h3>
                    <p
                      className="home-story-description"
                      lang={story.language ?? "ko"}
                    >
                      {metadataText(story.description)}
                    </p>
                    <StoryMetadata story={story} locale={locale} />
                    <ArticleTags
                      tags={story.tags}
                      homeUrl={homeUrl}
                      locale={locale}
                    />
                  </div>
                  <a
                    className="home-cover"
                    lang={story.language ?? "ko"}
                    href={story.url}
                    aria-label={story.title}
                  >
                    <ArticleVisual visual={story.visual} />
                  </a>
                </li>
              ))}
            </ul>
            {!stories.length && (
              <p className="home-empty">
                {text(
                  "아직 공개된 글이 없습니다.",
                  "No articles are available yet."
                )}
              </p>
            )}
          </section>

          <aside className="home-profile" aria-labelledby="profile-title">
            <span className="home-profile-mark" aria-hidden="true">
              m.
            </span>
            <p className="home-eyebrow">Behind the notes</p>
            <h2 id="profile-title">ooMia</h2>
            <p className="home-profile-intro">
              {text(
                "구조를 고민하고, 작게 실험하며, 오래 쓸 수 있는 소프트웨어를 만듭니다.",
                "I think through structure, run small experiments, and build software that lasts."
              )}
            </p>
            <nav
              className="home-contact"
              aria-label={text("연락처", "Contact")}
            >
              <a
                href="https://github.com/ooMia"
                aria-label="GitHub"
                title="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="github" />
              </a>
              <a
                href="https://www.linkedin.com/in/김현학/"
                aria-label="LinkedIn"
                title="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="linkedin" />
              </a>
              <a
                href="mailto:dev@oomia.click"
                aria-label={text("이메일 보내기", "Send email")}
                title={text("이메일 보내기", "Send email")}
              >
                <Icon name="mail" />
              </a>
            </nav>
            <div className="home-profile-links">
              <a
                href="https://solved.ac/profile/hs1891179"
                target="_blank"
                rel="noopener noreferrer"
              >
                solved.ac <Icon name="external-link" />
              </a>
              <a
                href="https://gravatar.com/oomia6"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gravatar <Icon name="external-link" />
              </a>
            </div>
          </aside>
        </div>
        {children && (
          <div className="home-activity" lang="ko">
            {children}
          </div>
        )}
        <SiteFooter locale={locale} />
      </div>
    </SiteFrame>
  );
}
