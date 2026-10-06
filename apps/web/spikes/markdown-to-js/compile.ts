import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import { markdownToJs, mdxToJs, type MarkdownToJsOptions } from "satteri";

/** Build/test only. Never evaluate untrusted source or generated JS in the browser. */
export async function compileAndRender(
  source: string,
  format: "markdown" | "mdx",
  options: MarkdownToJsOptions,
  components: Record<string, unknown>,
  provider?: Record<string, unknown>
) {
  const compiler = format === "markdown" ? markdownToJs : mdxToJs;
  const result = await compiler(source, {
    ...options,
    outputFormat: "function-body",
  });
  // The public compiler function-body format requires a runtime binding.
  // oxlint-disable-next-line typescript/no-implied-eval -- isolated trusted build proof
  const module = new Function(result.code)({
    ...runtime,
    useMDXComponents: () => provider ?? {},
  }) as { default: ComponentType<{ components: Record<string, unknown> }> };
  return {
    code: result.code,
    html: renderToStaticMarkup(createElement(module.default, { components })),
    data: result.data,
  };
}
