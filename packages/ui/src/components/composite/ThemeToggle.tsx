import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "../button"

export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<"theme-light" | "dark">(() => {
    if (typeof window === "undefined") return "theme-light"
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches
    return prefersDark ? "dark" : "theme-light"
  })

  React.useEffect(() => {
    document.documentElement.classList[theme === "dark" ? "add" : "remove"](
      "dark"
    )
  }, [theme])

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() =>
        setThemeState((prev) => (prev === "dark" ? "theme-light" : "dark"))
      }
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
