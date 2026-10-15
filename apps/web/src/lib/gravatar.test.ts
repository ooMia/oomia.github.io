import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { getGravatarCard } from "./gravatar";

vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const card = {
  src: "https://gravatar.com/oomia6.card",
  width: 351,
  height: 436,
};
const fetchMock = vi.fn();

describe("Gravatar official iframe metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ width: card.width, height: card.height }))
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetches only oEmbed and preserves the provider's complete geometry", async () => {
    await expect(getGravatarCard("oomia6")).resolves.toEqual(card);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as URL;
    expect(url.origin + url.pathname).toBe(
      "https://api.gravatar.com/v3/oembed"
    );
    expect(url.searchParams.get("url")).toBe("https://gravatar.com/oomia6");
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining("oomia6.json"),
      JSON.stringify(card, null, 2),
      "utf8"
    );
  });

  it("reuses current metadata without contacting the provider", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(card));
    await expect(getGravatarCard("oomia6")).resolves.toEqual(card);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("does not spread cached HTML or other attributes onto the iframe", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ ...card, srcdoc: "<p>Obsolete HTML</p>" })
    );
    await expect(getGravatarCard("oomia6")).resolves.toEqual(card);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    JSON.stringify({ srcdoc: "<p>Legacy card</p>", width: 336, height: 402 }),
    JSON.stringify({ ...card, height: 0 }),
    JSON.stringify({ ...card, src: "https://example.com/other.card" }),
    "broken JSON",
  ])("refreshes obsolete or invalid cached metadata: %s", async (cache) => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(cache);
    await expect(getGravatarCard("oomia6")).resolves.toEqual(card);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid provider geometry instead of caching a clipped card", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ width: 0, height: 436 }))
    );
    await expect(getGravatarCard("oomia6")).rejects.toThrow(
      "invalid card dimensions"
    );
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("preserves provider errors without attempting to fetch card HTML", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(getGravatarCard("oomia6")).rejects.toThrow(
      "Gravatar oEmbed: 503"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
