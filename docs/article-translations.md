# Article translation consumer

> **Authority:** REFERENCE\
> **Owner:** Site optional translated-content input and native rendering\
> **Scope:** local Docs translation artifacts consumed by Site\
> **Read when:** implementing or validating KO/EN routes and a compatible translation producer\
> **Source of truth:** `apps/web/src/content.config.ts`, `article-translations.ts`, native integrity checks and fixtures

Site supports Korean original URLs and English routes under `/en/` using the existing Astro content collection and native Markdown/MDX pipeline. This document describes the implemented consumer input. It is a candidate format for alignment with a future Engine/Docs producer; it does not establish or operate that producer, choose an AI provider, declare a new Docs production workflow, or attest that the current corpus has English translations.

Site never generates these artifacts or invokes an AI provider during content sync, build, prerender or browser navigation. A missing manifest or missing successful record is valid and retains the original article. The English route labels that fallback, marks its Korean content with `lang="ko"`, points canonical/social metadata to the original, and emits `noindex,follow`. Successful translations use their own English canonical URL and reciprocal language alternates. The original URL remains unchanged.

## Optional consumer format

At the selected Docs checkout, the consumer reads `derived/article-translations.json`:

```json
{
  "schemaVersion": 1,
  "records": [
    {
      "sourcePath": "content/articles/tech/example.md",
      "targetLocale": "en",
      "sourceSha256": "<64 lowercase hexadecimal characters>",
      "translationSha256": "<64 lowercase hexadecimal characters>",
      "translationPath": "derived/article-translations/en/<translationSha256>.md",
      "originalDocsRevision": "<40 lowercase hexadecimal characters>",
      "status": "available"
    }
  ]
}
```

The placeholders illustrate the shape and are not usable fixture hashes.

| Field | Meaning and checks |
| --- | --- |
| `schemaVersion` | Exactly numeric `1`. |
| `sourcePath` | Stable original source identity under `content/articles/`; `.md` or `.mdx`; no empty, `.` or `..` path segment and no backslash. One record per source identity. |
| `targetLocale` | Exactly `en` in this slice. Korean remains the original content path. |
| `sourceSha256` | SHA-256 of the full original file bytes, including frontmatter. Must match the source blob at the original revision, source blob at the selected Docs revision, and actual source file bytes. |
| `translationSha256` | SHA-256 of the full translated file bytes. |
| `translationPath` | Exactly `derived/article-translations/en/<translationSha256>` plus the original `.md`/`.mdx` extension. No duplicate artifact path or grammar conversion. |
| `originalDocsRevision` | An existing ancestor of the actual selected Docs checkout. Equality with the selected revision is allowed but not required. This permits a producer to read original commit A and persist derived artifacts in later commit B while the original remains unchanged. |
| `status` | Exactly `available`. Failure/pending status records are not interpreted as successful translations. A producer can omit unavailable outputs from this optional successful-record set while retaining its operational failures in the producer-owned recovery/evidence surface. |

The selected Docs SHA is derived from the actual Git checkout. The existing immutable Docs selection and readiness contract still applies; translation provenance does not replace the Article `oomia:docs-revision` marker. A supplied selected SHA must equal actual HEAD. The original revision must be reachable, so the required Git history must be available.

Manifest, canonical source and translated file real paths must remain inside the Docs checkout and their declared namespaces, including through symlinks. A dangling supplied manifest, missing referenced file, unsupported shape/status, duplicate, corrupt bytes, stale source or revision mismatch fails closed. These integrity failures are not converted into an ordinary “translation unavailable” fallback. UTF-8 decoding is strict.

## Native content and metadata

Only verified files enter the optional `articleTranslations` content collection. Their translated frontmatter requires nonempty `title` and string `description`. The consumer uses those translated fields for presentation. Publication visibility/order, article identity, author, dates, aliases and tag identity come from the original Article model; translated frontmatter cannot redefine them. Locale variants are not counted as separate articles for tag membership.

The collection uses Astro's native `glob` loader. `.md` continues through Sätteri; `.mdx` continues through Astro's native MDX processor and the existing component mapping. There is no `.md` to `.mdx` rename, second renderer/compiler, generated function-body evaluation or provider call.

Validation occurs in the content-sync loader. Afterwards, the loader stores only translated title/description and verified `sourcePath`, `sourceSha256`, `translationSha256`, `originalDocsRevision` in the entry data. These provenance fields overwrite same-named untrusted frontmatter. Runtime/prerender routes read the validated content collection DTO; they do not import the filesystem/Git/native-parser validator. This keeps native parser bindings and producer input checks in the build input boundary.

When the native file digest matches a cached entry, Astro's public store setter can skip a metadata write. The loader therefore replaces an entry through the public delete/set API only when its projected data differs, retaining native rendered content, file path, assets and digest. A manifest-only provenance change is reflected without changing translated document bytes.

## Protected syntax and assets

`@workspace/md` provides a parse-only integrity check using the same native grammar families: Sätteri MDAST for Markdown and the MDX parser for MDX. Astro's frontmatter parser preserves source offsets. The integrity check does not render, compile or evaluate document code.

Translation preserves source-position bytes for fenced/inline code, math, raw HTML, MDX component opening/closing syntax, attributes, expressions and ESM. Native link/image/reference destinations retain their authored representation; reference identities and protected token order remain unchanged. Natural prose, headings, normal link labels, image descriptions and Markdown link tooltips may be translated. Raw HTML and executable/attribute syntax stay opaque in this first slice.

Translated heading text produces different native heading IDs. Consumer v1 therefore rejects nonempty local fragment destinations such as `[next](#section)`, reference definitions targeting `#section`, and static HTML/JSX `href` fragments. It does not preserve a destination that would silently lose its target after heading translation. External URL fragments and the bare top-of-page `#` remain supported. Native MDX ESTree string-literal `href` expressions are checked without evaluation; other dynamic `href` expressions require an explicit target resolver and are unsupported. A future heading target resolver must prove native ID preservation before relaxing this restriction.

Relative image/media references cannot be silently consumed from a hash file under `derived/`, because the native compiler's source directory and browser route may differ from the canonical source context. Consumer v1 therefore rejects relative Markdown images, reference images, raw HTML media and static JSX media sources. Absolute public paths or scheme-qualified sources are retained verbatim and remain subject to the existing asset/render validation. The consumer does not repair canonical URLs or change authored destinations. `srcset` and dynamic JSX media references require a deliberate asset resolver and are unsupported here.

A future source-relative resolver or producer artifact layout must demonstrate native asset resolution and preserve canonical URI semantics before relaxing these restrictions. An absence of translated artifacts in the current corpus does not prove support for these unresolved asset cases.

## Verification

Relevant unit checks:

```sh
vp test packages/md/src/translation-integrity.test.ts \
  apps/web/src/lib/content/article-translations.test.ts \
  apps/web/src/lib/presentation/locale.test.ts
```

Native build fixture:

```sh
vp exec --filter web -- node tests/translations/build.mjs
```

The isolated fixture creates an original Docs commit and a later derived-artifact commit, then reuses the production collection/processor and Astro `render()` for two actual English `.md`/`.mdx` routes. Its package boundary and Astro/Vite caches are local to the temporary project. It checks translated headings/prose, exact rendered code whitespace, unchanged destinations, table, quote, absolute image, an MDX Callout, original author/tags and verified provenance despite conflicting translated frontmatter. A second build with unchanged translated files and updated manifest provenance exercises the existing native content cache. Static local evidence is saved under ignored `apps/web/test-results/translations`; the temporary fixture is removed.

The fixture does not invoke a browser or AI provider, mutate the mounted canonical Docs checkout, or prove CI, deployment or an operating translation producer. The real-corpus build and browser validation remain separate evidence.

## Related owners

- [Content consumption contract](content-consumption-contract.md): canonical input, immutable Docs selection, readiness/integrity and publishing boundary.
- [Presentation foundation](presentation-foundation.md): layout, language controls, themes and reading experience.
- [Native fixture](../apps/web/tests/translations/README.md): executable local consumer validation and current asset limits.

The producer/persistence integration must align with this actual consumer input and the Docs-owned readiness attestation before operational use. Provider configuration, generation/recovery and Docs persistence are future producer work and are not implied by this Site change.
