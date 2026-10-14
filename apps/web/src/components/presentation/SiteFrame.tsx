import type { CSSProperties, ReactNode } from "react";

import { HomeLayout, useHomeLayout } from "fumadocs-ui/layouts/home";
import { RootProvider } from "fumadocs-ui/provider/astro";
import { createContext, useContext } from "react";

import type { SiteLocale } from "@/lib/presentation/locale";

import { languageSwitchUrl } from "@/lib/presentation/locale";
import { withBasePath } from "@/lib/utils";

import { Icon } from "./Icon";
import "./shared.css";
const HeaderContext = createContext({
  homeUrl: "/",
  locale: "ko" as SiteLocale,
  localeUrl: "/en/",
});
function SiteHeader() {
  const { slots } = useHomeLayout();
  const { homeUrl, locale, localeUrl } = useContext(HeaderContext);
  const ThemeSwitch = slots.themeSwitch;
  return (
    <header className="site-header">
      <nav
        className="site-nav"
        aria-label={locale === "en" ? "Site navigation" : "사이트"}
      >
        <slots.navTitle className="site-brand" />
        <div className="site-nav-controls">
          <a className="notes-link" href={`${homeUrl}#recent-articles`}>
            <Icon name="book" />
            {locale === "en" ? "Notes" : "기록"}
          </a>
          <a className="about-link" href={`${homeUrl}#profile-title`}>
            {locale === "en" ? "About" : "소개"}
          </a>
          <a
            className="site-locale"
            href={localeUrl}
            hrefLang={locale === "en" ? "ko" : "en"}
            aria-label={
              locale === "en" ? "한국어 원문으로 전환" : "Switch to English"
            }
          >
            <Icon name="languages" />
            {locale === "en" ? "KO" : "EN"}
          </a>
          {ThemeSwitch && <ThemeSwitch mode="light-dark" />}
        </div>
      </nav>
    </header>
  );
}
export interface SiteFrameProps {
  pathname: string;
  homeUrl: string;
  children: ReactNode;
  locale?: SiteLocale;
  localeUrl?: string;
  hue?: number;
}
export function SiteFrame({
  pathname,
  homeUrl,
  children,
  locale = "ko",
  localeUrl,
  hue = 145,
}: SiteFrameProps) {
  const base = import.meta.env.BASE_URL;
  const alternate =
    localeUrl ??
    languageSwitchUrl(pathname, locale === "ko" ? "en" : "ko", base);
  return (
    <RootProvider
      pathname={pathname}
      search={{ enabled: false }}
      theme={{ hotKey: false }}
      i18n={{
        locale,
        defaultLanguage: "ko",
        locales: [
          { locale: "ko", name: "한국어" },
          { locale: "en", name: "English" },
        ],
        translations:
          locale === "ko"
            ? { search: "검색", toc: "목차", chooseLanguage: "언어" }
            : {
                search: "Search",
                toc: "On this page",
                chooseLanguage: "Language",
              },
        onLocaleChange: (value) => {
          if (value === "ko" || value === "en")
            window.location.assign(languageSwitchUrl(pathname, value, base));
        },
      }}
    >
      <HeaderContext.Provider value={{ homeUrl, locale, localeUrl: alternate }}>
        <HomeLayout
          nav={{
            title: (
              <>
                <span className="brand-symbol" aria-hidden="true">
                  <i />
                  <i />
                </span>
                ooMia
              </>
            ),
            url: homeUrl,
          }}
          slots={{ header: SiteHeader }}
          style={
            { "--fd-layout-width": "80rem", "--hue": hue } as CSSProperties
          }
          searchToggle={{ enabled: false }}
        >
          <a className="skip-link" href="#main">
            {locale === "en" ? "Skip to content" : "본문으로 이동"}
          </a>
          {children}
        </HomeLayout>
      </HeaderContext.Provider>
    </RootProvider>
  );
}
export function SiteFooter({ locale = "ko" }: { locale?: SiteLocale }) {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} ooMia</span>
      <nav aria-label={locale === "en" ? "Site information" : "사이트 정보"}>
        <span>RSS · {locale === "en" ? "Coming soon" : "준비 중"}</span>
        <a href={withBasePath("/sitemap-index.xml", import.meta.env.BASE_URL)}>
          Sitemap ↗
        </a>
        <details>
          <summary>
            {locale === "en" ? "License unspecified" : "라이선스 미지정"} ⓘ
          </summary>
          <p>
            {locale === "en"
              ? "A shared license for Site code and article content has not been specified."
              : "Site 코드와 글 콘텐츠에 공통 라이선스가 별도로 명시되어 있지 않습니다."}
          </p>
        </details>
      </nav>
      <small>
        Powered by ooMia Publishing Platform ·{" "}
        <a href="https://astro.build/">Astro</a> ·{" "}
        <a href="https://fumadocs.dev/">Fumadocs</a>
      </small>
    </footer>
  );
}
