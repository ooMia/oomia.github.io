import type { RefObject } from "react";

import { useEffect } from "react";

interface NativeArticleEnhancementsProps {
  bodyRef: RefObject<HTMLDivElement | null>;
  locale: "ko" | "en";
}

/** Adapt native Astro output after hydration without a second Markdown renderer. */
export function NativeArticleEnhancements({
  bodyRef,
  locale,
}: NativeArticleEnhancementsProps) {
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const cleanups: (() => void)[] = [];
    let disposed = false;

    for (const pre of body.querySelectorAll<HTMLPreElement>("pre")) {
      if (
        pre.closest(
          "[data-native-code],.fd-codeblock,figure[data-rehype-pretty-code-figure]"
        )
      )
        continue;
      const code = pre.querySelector("code");
      if (!code) continue;
      const frame = document.createElement("figure");
      frame.className = "article-code-frame not-prose";
      frame.dataset["nativeCode"] = "true";
      frame.dataset["scrollSurface"] = "code";
      const caption = document.createElement("figcaption");
      caption.className = "article-code-toolbar";
      const language = document.createElement("span");
      const sourceLanguage =
        pre.dataset["language"] ??
        [...code.classList]
          .find((value) => value.startsWith("language-"))
          ?.slice(9);
      language.textContent =
        sourceLanguage ?? (locale === "en" ? "Code" : "코드");
      const button = document.createElement("button");
      button.type = "button";
      const copyLabel = locale === "en" ? "Copy code" : "코드 복사";
      button.textContent = copyLabel;
      button.setAttribute("aria-label", copyLabel);
      const status = document.createElement("span");
      status.className = "sr-only";
      status.setAttribute("role", "status");
      let timer = 0;
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? "");
          if (disposed) return;
          button.textContent = locale === "en" ? "Copied" : "복사됨";
          status.textContent =
            locale === "en" ? "Code copied." : "코드를 복사했습니다.";
        } catch {
          if (disposed) return;
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(code);
          selection?.removeAllRanges();
          selection?.addRange(range);
          status.textContent =
            locale === "en"
              ? "Code selected. Use your keyboard copy shortcut."
              : "코드를 선택했습니다. 키보드 복사 단축키를 사용하세요.";
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          button.textContent = copyLabel;
          status.textContent = "";
        }, 2200);
      };
      button.addEventListener("click", copy);
      caption.append(language, button, status);
      pre.before(frame);
      frame.append(caption, pre);
      cleanups.push(() => {
        window.clearTimeout(timer);
        button.removeEventListener("click", copy);
        frame.replaceWith(pre);
      });
    }

    for (const table of body.querySelectorAll<HTMLTableElement>("table")) {
      if (table.closest("[data-native-table]")) continue;
      const wrapper = document.createElement("div");
      wrapper.className = "article-table-scroll";
      wrapper.dataset["nativeTable"] = "true";
      wrapper.dataset["scrollSurface"] = "paper";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute(
        "aria-label",
        table.querySelector("caption")?.textContent ||
          (locale === "en" ? "Scrollable table" : "스크롤 가능한 표")
      );
      table.before(wrapper);
      wrapper.append(table);
      cleanups.push(() => wrapper.replaceWith(table));
    }

    // Latin-only spacing keeps accepted .015em tracking off Korean glyphs.
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (
          !parent ||
          parent.closest(
            "pre,code,script,style,textarea,button,input,select,option,svg,math,.katex,[data-latin-run]"
          )
        )
          return NodeFilter.FILTER_REJECT;
        return /[A-Za-z0-9]/.test(node.textContent ?? "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    for (const node of textNodes) {
      const text = node.data;
      const expression = /[A-Za-z0-9][A-Za-z0-9\t .,:'"!?/()&=+-]*/g;
      const fragment = document.createDocumentFragment();
      let index = 0;
      for (const match of text.matchAll(expression)) {
        fragment.append(text.slice(index, match.index));
        const run = document.createElement("span");
        run.dataset["latinRun"] = "true";
        run.textContent = match[0];
        fragment.append(run);
        index = match.index + match[0].length;
        cleanups.push(() => run.replaceWith(...run.childNodes));
      }
      fragment.append(text.slice(index));
      node.replaceWith(fragment);
    }

    return () => {
      disposed = true;
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [bodyRef, locale]);

  return null;
}
