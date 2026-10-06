# Site #53 — historical Markdown component investigation

Historical evidence for [PR #59](https://github.com/ooMia/oomia.github.io/pull/59), frozen at investigation revision [`68d2c9f`](https://github.com/ooMia/oomia.github.io/tree/68d2c9f). The executable spike, script and legacy HAST path have been removed from PR #60. Commands and implementation descriptions below apply only to that revision, not the current checkout.

Local evidence collected 2026-10-06 (Asia/Seoul). This completes the first investigation slice of [Site #53](https://github.com/ooMia/oomia.github.io/issues/53), not the rich v2 LinkCard feature or a production rendering migration.

## Reproduce

From the Site root, with the pinned Docs submodule initialized:

```sh
vp install --frozen-lockfile
vp exec --filter web -- playwright install chromium
vp run --filter web spike:markdown
vp exec --filter web -- astro check --root spikes/markdown-to-js/astro
```

The script runs standalone proofs and a timing observation, builds a separate Astro fixture with fetch/http(s) blocked, then checks the generated page in Chromium with outgoing requests aborted. Generated output is ignored under `apps/web/spikes/markdown-to-js/astro/dist/`. Its `/index.html` contains two fixture documents and the ten pinned canonical articles. The normal Site build does not include this route or enable this processor.

## Versions and source linkage

- Site base: `77e5647403437b731fadc55657725092dfbf0b51` (`main`). Implementation revision is the commit containing this evidence, linked by the owning PR/Issue comment.
- Docs: `feda09afb4343028be4c680fc5ba9dcf267b6366`; source and gitlink unchanged.
- Installed compatibility set: Astro `7.3.1`, `@astrojs/mdx 8.0.0`, `@astrojs/markdown-satteri 0.4.0`, Sätteri `0.10.5`, React/React DOM `19.2.8`.
- Local runtime: Node `24.21.0`, macOS arm64. No upgrade was needed for the proofs.
- Local manifest fixtures supply basic records, including the JetBrains URL used by `TDD-dev-flow.md`. No producer v2 format is invented here.

## Results

| Question                                               | Executed observation                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain Markdown → generated semantic target → component | PASS: `markdownToJs()` compiles a plugin-generated `mdxJsxTextElement` into a `LinkCard` mapping lookup. This compiler node does not change the source grammar.                                                                                                                                            |
| Provider mapping                                       | PASS: function-body output accepts `useMDXComponents` through the runtime binding, without a components prop.                                                                                                                                                                                              |
| Typed Site boundary                                    | PASS: Site checks local projection before inserting a target; target carries only href. The Site mapping resolves `LinkCardData` and passes it to its static React component. Producer provenance/full summary never enters props.                                                                         |
| Ordinary fallback                                      | PASS: inline/internal/unknown-metadata/multiple-child paragraphs stay ordinary links.                                                                                                                                                                                                                      |
| Grammar                                                | PASS: `.md` expression/export text remains text; `.mdx` expressions evaluate and its authored Callout renders. An angle-bracket autolink is valid Markdown, but the MDX fixture needed `[Fixture](url)` because `<https://…>` is parsed as JSX and rejected. No canonical source was renamed or rewritten. |
| Astro collection integration                           | PASS: public `markdown.processor.createRenderer`, public Sätteri compiler, and `glob → getCollection → render` produce static component HTML. MDX delegates through public `createMdxRenderer`. Both formats reach the same Site React component.                                                          |
| Corpus                                                 | PASS: 10 canonical articles + 2 fixtures built. DOM proof found 3 component LinkCards, the existing MDX Callout, literal Markdown expressions, and HTML text. Standalone tests also cover TDD, Pattern, and the parameterized-test MDX article.                                                            |
| Network boundary                                       | PASS for exercised fetch/http(s) APIs: build succeeds with requests throwing. Astro telemetry initially triggered the guard; it is disabled only in this proof process. No target-page/MCP/inference/image download was added. This probe is not a general network security sandbox.                       |
| Browser delivery                                       | Fixture has 0 script tags and 103,756 HTML bytes. Astro emits 1 unreferenced React client asset; no hydration directive is used. Browser request handler observed 0 requests while inspecting the HTML with `setContent`; this is a DOM proof, not asset-loading or visual readability evidence.           |

## Architecture implemented now

`@workspace/md` owns only paragraph-singleton external HTTP(S) anchor detection. Its callback receives href and anchor and returns a Site-owned render target, or undefined for ordinary-link fallback. It imports no producer schema and builds no card visual DOM.

Site owns `LinkCardData`, the local manifest adapter/resolver, and the existing static HAST presentation (`link-card-static.ts`). Existing production card presentation was moved to Site without expanding its DOM. The opt-in spike independently supplies a component target and Site React component. The markup/component implementation can change without changing semantic detection.

## Raw HTML, security, and trust boundary

`rawHtml` is a feature under `features`, not a sanitization switch. The following assertions execute in `standalone.test.ts`; unsafe probes are serialized to strings only and are not loaded in the browser fixture.

| Setting/probe                 | Result / implication                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default `markdownToJs()`      | Opaque block HTML, including the tested div's text, is dropped. This loses useful authored content and cannot meet our content-preservation requirement by itself.                                                          |
| `features.rawHtml: true`      | Reparses HTML as structured nodes; preserves div text, classes, and literal braces. Useful for existing Markdown HTML conventions and HAST semantic plugins. Source positions through reparse are not preserved by Sätteri. |
| Script probe                  | `<script>alert("probe")</script>` survives serialization. Inserting such output in a delivered page can execute script.                                                                                                     |
| String event handler          | React SSR omits tested `onerror`. That behavior is renderer-specific and does not make the pipeline a sanitizer.                                                                                                            |
| Iframe srcdoc                 | Encoded script-bearing `srcDoc` survives. Attribute escaping alone does not remove its executable nested-document semantics.                                                                                                |
| Markdown JS-like text in HTML | `{globalThis.__markdownSpikeProbe = true}` stays literal; no build-time assignment occurs. Parsing raw HTML does not enable MDX expressions.                                                                                |
| Manifest title                | `<title>`, quotes, ampersands and braces are escaped as component text. No `dangerouslySetInnerHTML` is used for metadata.                                                                                                  |

The experiment assumes reviewed canonical repository content and reviewed plugins/mappings. Repository origin alone does not establish safe HTML: future external or automatically generated source must be evaluated at this boundary. Existing MDX remains executable content with build-process capabilities; it is delegated to Astro, not made safe by this Markdown proof.

`compileAndRender` evaluates only compiler-generated function-body code in the isolated build/test path. It is not a browser/request-time evaluator and must not be exposed to arbitrary submitted content. The plain Markdown tests establish the tested grammar behavior, not a sandbox against malicious dependencies or compiler bugs.

For untrusted HTML, sanitization is necessary before delivery. A candidate owner is Site's rendering boundary: after raw HTML reparsing and before trusted semantic targets are inserted, apply an explicit element/attribute/URL allowlist (including nested documents, script, event handlers, and CSS). Trusted generated targets must not be confused with authored HTML. This spike does not introduce a production sanitizer or silently define an allowlist policy. Raw reparsing is retained as an experimental candidate only; production adoption requires an explicit safe-HTML contract and tests.

## Framework coupling and integration limits

- The standalone proof uses Sätteri's public generated MDX-node representation and React automatic JSX runtime. Mapping/provider contracts are framework-specific, even though source remains Markdown.
- The Markdown processor returns **HTML**, not an Astro component module. Components are chosen at build time; passing `<Content components={…}>` cannot override an already serialized Markdown card. MDX retains render-time mapping. This proves shared presentation implementation, not identical lifecycle/provider semantics.
- Static React rendering cannot directly render an `.astro` component. The MDX Callout remains an Astro component through the native MDX path; an equivalent plain-Markdown convention needs its own semantic mapping.
- The proof compiles Markdown twice: the normal public processor obtains Astro metadata, then `markdownToJs()` renders React output. Metadata's heading list exists but Markdown output has no matching heading IDs. DOM tests explicitly record this mismatch.
- The replaced Markdown HTML also bypasses native syntax-highlighted output and Astro image markers. Only the MDX path generated two optimized images in the fixture; relative Markdown images are not reconciled with those metadata/assets. Math, wikilink, directive and the complete production feature set are not certified by this adapter.
- No private Astro imports, internal API fork, core Vite plugin copy, custom collection loader, or generated `.mdx` source is used.

## Performance and bundle observation

A warmed single-process observation on the 10,403-byte canonical TDD source, 100 rounds:

| Operation                                                       | Mean / size                    |
| --------------------------------------------------------------- | ------------------------------ |
| `markdownToHtml`                                                | 0.469 ms                       |
| `markdownToJs` + function-body evaluation + React static render | 1.897 ms                       |
| Generated JS module                                             | 66,037 bytes; 4,133 gzip bytes |

This is a local observation without timing thresholds, includes no card mapping, and is not an end-to-end Astro benchmark. The adapter additionally pays the metadata compile. Generated module size is build-side code, not downloaded JS. The fixture page has no hydration script, although the installed React integration emits an unused client asset. Production bundle behavior is unchanged because the experimental processor is not selected by the normal config.

## Decision and remaining work

**Adopt the semantic/presentation ownership split now. Keep the public component processor as an executable candidate; do not adopt this adapter as the 1.1 core path yet.** Sätteri/component mapping is viable and Astro can consume its static output without internal forks. The remaining issues are HTML policy, metadata/heading IDs, highlighting, image integration, feature coverage and compile cost. A follow-up must solve these through small public extensions, or use the now-separated typed static renderer while deferring unified component rendering. A private/compiler fork remains a rejection criterion.

Engine #79 and Docs #16 were still open when checked. They do not block this spike; they block real-v2 provenance and exact v2 Docs → Site → route evidence. Rich three-row layout/calibration, image/site-name v2 projection and responsive rich-card checks remain later #53 work.

## Validation obtained

- `vp run --filter web spike:markdown`: 9 standalone/observation tests, network-guarded Astro build and Chromium DOM proof passed.
- `vp check --no-fmt`: 0 warnings/errors, including a clean probe with the spike `.astro` directory absent. The first PR CI run exposed that this fixture had relied on generated ambient types; its own tsconfig now explicitly loads the public `astro/client` types. Remote CI results remain revision-bound in PR #59.
- `vp test`: 49 tests passed across 11 files.
- Normal Site `typecheck`, UI `typecheck`, and spike Astro `check`: passed; Astro reported no diagnostics.
- Normal Site build: passed, 11 pages. Local canonical image cache entries were reused.
- Full local Site E2E: 30 desktop/mobile tests passed, including existing LinkCard/Callout and full-corpus asset/overflow checks. This validates the production boundary extraction, not the experimental processor's missing image/heading behavior.
- No CI, merge, Pages release, cross-OS execution or real-v2 integration is implied by these local results.
