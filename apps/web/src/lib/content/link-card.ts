import type { LinkCardData } from "@workspace/md";

const metadata: Readonly<Record<string, LinkCardData>> = {
  "https://www.jetbrains.com/help/idea/working-with-source-code.html": {
    url: "https://www.jetbrains.com/help/idea/working-with-source-code.html",
    title: "Write and edit source code",
    description:
      "IntelliJ IDEA documentation for editing and working with source code.",
    siteName: "JetBrains",
  },
};

export default function resolveLinkCardData(
  value: string
): LinkCardData | undefined {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return metadata[url.href];
  } catch {
    return undefined;
  }
}
