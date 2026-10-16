# Article translation consumer

> **Authority:** REFERENCE\
> **Owner:** Site optional translated-content input and native rendering\
> **Scope:** local Docs translation artifacts consumed by Site\
> **Read when:** creating a manual translation, implementing or validating KO/EN routes and a compatible translation producer\
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

| Field                  | Meaning and checks                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schemaVersion`        | Exactly numeric `1`.                                                                                                                                                                                                                                                           |
| `sourcePath`           | Stable original source identity under `content/articles/`; `.md` or `.mdx`; no empty, `.` or `..` path segment and no backslash. One record per source identity.                                                                                                               |
| `targetLocale`         | Exactly `en` in this slice. Korean remains the original content path.                                                                                                                                                                                                          |
| `sourceSha256`         | SHA-256 of the full original file bytes, including frontmatter. Must match the source blob at the original revision, source blob at the selected Docs revision, and actual source file bytes.                                                                                  |
| `translationSha256`    | SHA-256 of the full translated file bytes.                                                                                                                                                                                                                                     |
| `translationPath`      | Exactly `derived/article-translations/en/<translationSha256>` plus the original `.md`/`.mdx` extension. No duplicate artifact path or grammar conversion.                                                                                                                      |
| `originalDocsRevision` | An existing ancestor of the actual selected Docs checkout. Equality with the selected revision is allowed but not required. This permits a producer to read original commit A and persist derived artifacts in later commit B while the original remains unchanged.            |
| `status`               | Exactly `available`. Failure/pending status records are not interpreted as successful translations. A producer can omit unavailable outputs from this optional successful-record set while retaining its operational failures in the producer-owned recovery/evidence surface. |

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

## Create a translation manually

This is a manual way to prepare this consumer's optional input in a separate Docs working checkout. It does not install an automatic producer or choose/run an AI provider. Keep canonical `content/` unchanged. Work from a clean, committed original with full Git history; preserve any existing author changes before proceeding.

1. In the Docs checkout, select one committed `content/articles/**/*.md` or `.mdx` file and record `git rev-parse HEAD` as original commit A. Confirm `git status --porcelain --untracked-files=all` is empty. Copy that file to a temporary file with the **same extension** outside the Docs checkout. Translate prose, headings and the frontmatter `title`/`description` by hand. Do not rename `.md` to `.mdx` or add a wrapper renderer. `title` must be nonempty and `description` must be a string; the original continues to own author, dates, draft, tags, aliases, identity and order. Omit those other translated metadata fields to avoid misleading authors; supplied provenance fields are overwritten by the validated consumer DTO.
2. Preserve protected bytes and order exactly: code fences/content/whitespace, inline code, math, raw HTML, MDX tags/attributes/expressions/imports/exports, and link/image/reference destinations. Natural link labels, image descriptions and Markdown link tooltips may be translated. Retain absolute URLs and public image paths verbatim. Relative images/media, `srcset`, dynamic media, nonempty local fragments (`#heading`) and unresolved dynamic `href` are unsupported. A source with these constructs cannot be made compatible by changing or removing them only in its translation. Use a supported source or resolve the canonical authoring/asset contract separately.
3. Package the final UTF-8 **full file bytes**, including frontmatter and final newline, under the hash filename and add one successful manifest record. Any edit after hashing requires a new hash, filename and record. The following local command only packages an already manually translated file; it does not translate or call a provider. Replace its three arguments with your Docs checkout, source identity and temporary translated file. The extension must match the source.

```sh
node --input-type=module - /absolute/path/to/docs \
  content/articles/tech/example.mdx /absolute/path/to/translated-example.mdx <<'NODE'
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, extname, resolve} from 'node:path';

const [docs, sourcePath, translatedFile] = process.argv.slice(2);
const git = (...args) => execFileSync('git', ['-C', docs, ...args]);
assert.equal(git('status', '--porcelain', '--untracked-files=all').toString().trim(), '', 'Start from a clean committed Docs checkout');
assert.match(sourcePath, /^content\/articles\/.+\.(md|mdx)$/);
assert.ok(!sourcePath.includes('\\') && sourcePath.split('/').every(part => part && part !== '.' && part !== '..'));
assert.equal(extname(translatedFile), extname(sourcePath));
const originalDocsRevision = git('rev-parse', 'HEAD').toString().trim();
const source = readFileSync(resolve(docs, sourcePath));
assert.deepEqual(source, git('show', `${originalDocsRevision}:${sourcePath}`));
const translation = readFileSync(translatedFile);
new TextDecoder('utf-8', {fatal: true}).decode(translation);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceSha256 = hash(source);
const translationSha256 = hash(translation);
const translationPath = `derived/article-translations/en/${translationSha256}${extname(sourcePath)}`;
const manifestPath = resolve(docs, 'derived/article-translations.json');
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {schemaVersion: 1, records: []};
assert.equal(manifest.schemaVersion, 1);
assert.ok(Array.isArray(manifest.records));
assert.ok(!manifest.records.some(record => record.sourcePath === sourcePath), 'Review/replace an existing record deliberately');
const artifact = resolve(docs, translationPath);
mkdirSync(dirname(artifact), {recursive: true});
if (existsSync(artifact)) assert.deepEqual(readFileSync(artifact), translation);
else writeFileSync(artifact, translation, {flag: 'wx'});
manifest.records.push({sourcePath, targetLocale: 'en', sourceSha256,
  translationSha256, translationPath, originalDocsRevision, status: 'available'});
manifest.records.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath, 'en'));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({originalDocsRevision, sourceSha256,
  translationSha256, translationPath}, null, 2));
NODE
```

The command refuses to silently replace an existing source record. For a revision, deliberately update that record after revalidating the unchanged source, write the new hash artifact, and remove the older artifact only if no manifest record references it. Preserve all unrelated records. This packaging example checks bytes and identity; the actual native consumer below validates metadata, syntax, namespaces and provenance.

4. Review the Docs diff and commit only `derived/article-translations.json` and the exact printed `translationPath` through Docs' normal PR/review path. Keep original commit A as `originalDocsRevision`; the derived commit B is the selected checkout. A must be an ancestor of B, and the source blob must have the same `sourceSha256` at A, at B and on disk. Full history is necessary. Do not replace A with a Site SHA or an uncommitted state. Changing source later invalidates the record until it is reviewed and retranslated; removing an optional successful record deliberately restores the labeled Korean fallback.
5. Validate locally using the existing native checks below. To consume your committed derived checkout B, mount that independent Docs checkout at `apps/web/data/articles` in a disposable Site worktree (preserving any existing checkout), then run `vp run --filter web prepare:content --source=current`. This selects actual B without fetch/checkout and runs readiness plus native content sync; it does not mint `derived/site-consumption.json`. A missing/stale attestation must be resolved through [Docs preparation](https://github.com/ooMia/oomia.github.io.docs/blob/main/docs/enrichment-workflow.md#main-push-convergence-and-site-release-readiness-30), not a fabricated marker. Use the printed B for a full local build:

```sh
DOCS_CHECKOUT_MODE=resolved DOCS_CHECKOUT_REVISION=<full-Docs-B-SHA> \
  vp run --filter web build
```

The English route must contain the translated title/body and native Markdown/MDX output, the Article marker must identify B, and original metadata must remain authoritative. An invalid supplied record is a build error; absence alone uses fallback. For a reproducible supported `.md`/`.mdx` example without touching a real Docs checkout, run the temporary native fixture below. Do not use synthetic fixture artifacts as production content.

After the Docs change is reviewed and integrated, follow [Docs publishing/preparation](https://github.com/ooMia/oomia.github.io.docs/blob/main/docs/enrichment-workflow.md#workflow-entry-points) and [Site publishing operations](publishing.md). Docs' current automatic workflow does not create translations; this guide does not add producer persistence or broaden its derived-write allowlist. Readiness, local build, CI, Pages delivery and public English-route verification are separate evidence. Site consumes the committed artifact and never generates it during build/navigation.

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
