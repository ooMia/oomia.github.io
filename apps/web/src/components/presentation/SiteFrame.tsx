import type { ReactNode } from "react";

import { HomeLayout } from "fumadocs-ui/layouts/home";
import { RootProvider } from "fumadocs-ui/provider/astro";

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
        githubUrl="https://github.com/ooMia"
        searchToggle={{ enabled: false }}
      >
        {children}
      </HomeLayout>
    </RootProvider>
  );
}
