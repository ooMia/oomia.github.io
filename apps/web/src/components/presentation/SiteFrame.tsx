import type { CSSProperties, ReactNode } from "react";

import { HomeLayout, useHomeLayout } from "fumadocs-ui/layouts/home";
import { RootProvider } from "fumadocs-ui/provider/astro";

// A public header slot keeps theme and GitHub controls visible on mobile too.
function SiteHeader() {
  const { slots } = useHomeLayout();
  const ThemeSwitch = slots.themeSwitch;
  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-fd-background/95 backdrop-blur">
      <nav
        aria-label="사이트"
        className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 md:px-6"
      >
        <slots.navTitle className="font-semibold" />
        <div className="ml-auto flex items-center gap-3">
          {ThemeSwitch && <ThemeSwitch />}
          <a
            href="https://github.com/ooMia"
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-fd-muted-foreground hover:text-fd-foreground"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}

export interface SiteFrameProps {
  pathname: string;
  homeUrl: string;
  children: ReactNode;
}

// Keep provider and layout in one island; Astro owns the rendered content slot.
export function SiteFrame({ pathname, homeUrl, children }: SiteFrameProps) {
  return (
    <RootProvider
      pathname={pathname}
      search={{ enabled: false }}
      theme={{ hotKey: false }}
    >
      <HomeLayout
        nav={{ title: "ooMia", url: homeUrl }}
        slots={{ header: SiteHeader }}
        style={{ "--fd-layout-width": "80rem" } as CSSProperties}
        searchToggle={{ enabled: false }}
      >
        {children}
      </HomeLayout>
    </RootProvider>
  );
}
