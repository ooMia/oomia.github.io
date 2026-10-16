import type { RefObject } from "react";

import { useEffect } from "react";

interface NativeCodeActionsProps {
  bodyRef: RefObject<HTMLDivElement | null>;
  locale: "ko" | "en";
}

/** Static frames/source are build-owned. One delegated handler adds copying. */
export function NativeCodeActions({ bodyRef, locale }: NativeCodeActionsProps) {
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let disposed = false;
    const timers = new Map<HTMLButtonElement, number>();
    const buttons =
      body.querySelectorAll<HTMLButtonElement>("[data-code-copy]");
    for (const button of buttons) button.disabled = false;

    const copy = async (event: MouseEvent) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>("button[data-code-copy]")
          : null;
      if (!button || !body.contains(button)) return;
      const frame = button.closest("[data-native-code]");
      const source = frame?.querySelector<HTMLElement>("[data-code-source]");
      const status = frame?.querySelector<HTMLElement>("[data-copy-status]");
      if (!source || !status) return;
      try {
        await navigator.clipboard.writeText(source.textContent ?? "");
        if (disposed) return;
        button.dataset["copyState"] = "copied";
        status.textContent =
          locale === "en" ? "Code copied." : "코드를 복사했습니다.";
      } catch {
        if (disposed) return;
        const details = source.closest("details");
        if (details) {
          details.hidden = false;
          details.open = true;
        }
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(source);
        selection?.removeAllRanges();
        selection?.addRange(range);
        status.textContent =
          locale === "en"
            ? "Code selected. Use your keyboard copy shortcut."
            : "코드를 선택했습니다. 키보드 복사 단축키를 사용하세요.";
      }
      window.clearTimeout(timers.get(button));
      timers.set(
        button,
        window.setTimeout(() => {
          delete button.dataset["copyState"];
          status.textContent = "";
          timers.delete(button);
        }, 2200)
      );
    };
    body.addEventListener("click", copy);
    return () => {
      disposed = true;
      body.removeEventListener("click", copy);
      for (const timer of timers.values()) window.clearTimeout(timer);
      for (const button of buttons) button.disabled = true;
    };
  }, [bodyRef, locale]);
  return null;
}
