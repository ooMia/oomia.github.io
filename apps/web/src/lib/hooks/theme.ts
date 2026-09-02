import type { AstroIntegration } from "astro"
import { toggleTheme } from "@workspace/ui/lib/utils"
import { ThemeToggle } from "@workspace/ui/components/composite/ThemeToggle"

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
