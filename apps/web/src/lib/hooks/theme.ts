import type { AstroIntegration } from "astro"

import { ThemeToggle } from "@workspace/ui/components/composite/ThemeToggle"
import { toggleTheme } from "@workspace/ui/lib/utils"

export default function initTheme(): AstroIntegration {
  return {
    name: "init-theme",
    hooks: {
      "astro:config:setup": ({ injectScript }) => {
        injectScript("head-inline", `(${toggleTheme.toString()})();`)
      },
    },
  }
}

export { ThemeToggle }
