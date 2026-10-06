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

describe("v2 optional presentation projection", () => {
  const basic = { url: "https://example.com/article", title: "Article" };
  const presentation = {
    locale: "ko-KR",
    summaryLines: ["이해의 출발점", "핵심 개념의 연결", "실제 적용의 의미"],
  };
  test("projects ordered rich rows and safe remote preview without producer internals", () => {
    expect(
      projectExternalLinkRecord({
        ...basic,
        summary: "Full summary is separate",
        presentation: {
          ...presentation,
          method: "inference",
          maxCharactersPerLine: 16,
        },
        preview: {
          state: "available",
          image: "https://images.example.com/preview.png",
          siteName: "Example",
          fetchedAt: "private provenance",
        },
      })
    ).toEqual({
      ...basic,
      image: "https://images.example.com/preview.png",
      siteName: "Example",
      presentation,
    });
  });
  test.each([
    null,
    {},
    { ...presentation, locale: "invalid_locale" },
    { ...presentation, summaryLines: ["one", "two"] },
    { ...presentation, summaryLines: ["one", "", "three"] },
    { ...presentation, summaryLines: ["one\ntwo", "two", "three"] },
    { ...presentation, summaryLines: [" one", "two", "three"] },
  ])("malformed presentation %j keeps the basic card", (value) => {
    expect(
      projectExternalLinkRecord({ ...basic, presentation: value })
    ).toEqual(basic);
  });
  test("invalid image and unavailable preview do not break otherwise valid rich rows", () => {
    for (const preview of [
      { state: "available", image: "javascript:alert(1)" },
      { state: "unavailable", image: "https://example.com/image" },
    ])
      expect(
        projectExternalLinkRecord({ ...basic, presentation, preview })
      ).toEqual({ ...basic, presentation });
  });
});
