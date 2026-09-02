import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toggleTheme() {
  const getThemePreference = () => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
      return localStorage.getItem("theme")
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }

  const isDark = getThemePreference() === "dark"
  document.documentElement.classList[isDark ? "add" : "remove"]("dark")

  if (typeof localStorage !== "undefined") {
    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains("dark")
      localStorage.setItem("theme", isDarkNow ? "dark" : "light")
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
  }
}
