import { describe, expect, test } from "vite-plus/test";

import {
  createLinkCardResolver,
  parseExternalLinkManifest,
  projectExternalLinkRecord,
} from "./link-card";

describe("LinkCard derived manifest adapter", () => {
  test("projects only renderer-facing fields from a producer record", () => {
    expect(
      projectExternalLinkRecord({
        url: "https://example.com/article",
        title: "Example article",
        description: "Example description",
        generatedAt: "2026-10-04T00:00:00.000Z",
        summary: "# Provider summary",
        lilys: {
          projectId: 1,
          sourceId: 2,
          noteId: 3,
        },
      })
    ).toEqual({
      url: "https://example.com/article",
      title: "Example article",
      description: "Example description",
    });
  });

  test("normalizes URL identity before lookup", () => {
    const resolve = createLinkCardResolver([
      {
        url: "https://example.com",
        title: "Example",
        generatedAt: "2026-10-04T00:00:00.000Z",
        lilys: {
          projectId: 1,
          sourceId: 2,
          noteId: 3,
        },
      },
    ]);

    expect(resolve("https://example.com/")).toEqual({
      url: "https://example.com/",
      title: "Example",
    });
  });

  test("ignores malformed and unsupported records", () => {
    const resolve = createLinkCardResolver([
      null,
      {
        url: "file:///tmp/example",
        title: "Local file",
      },
      {
        url: "https://example.com/missing-title",
      },
      {
        url: "https://example.com/bad-description",
        title: "Bad description",
        description: 42,
      },
      {
        url: "https://example.com/valid",
        title: "Valid",
      },
    ]);

    expect(resolve("file:///tmp/example")).toBeUndefined();
    expect(resolve("https://example.com/missing-title")).toBeUndefined();
    expect(resolve("https://example.com/bad-description")).toBeUndefined();
    expect(resolve("https://example.com/valid")).toEqual({
      url: "https://example.com/valid",
      title: "Valid",
    });
  });

  test("invalid manifest JSON degrades to an empty record set", () => {
    expect(parseExternalLinkManifest("{")).toEqual([]);
  });
});
