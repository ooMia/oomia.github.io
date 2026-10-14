# Native translation consumer fixture

Run from Site with `vp exec --filter web -- node tests/translations/build.mjs`.

The fixture creates an isolated temporary project and Docs Git repository, commits native Markdown/MDX originals, then persists English artifacts in a later commit. Its package boundary, Astro cache, Vite cache and output directories are local to the fixture. It reuses the production content collection loader and processors and calls Astro's normal native `render()` with the same Callout/LinkCard mappings. There is no custom document compiler, runtime evaluation or provider call.

The two built routes verify translated headings/prose, code whitespace/bytes, URL destinations, tables, quotes, an absolute public image and an MDX Callout. Publication/author/tag identity comes from the original entries despite deliberately conflicting translated frontmatter. Local static evidence is saved under ignored `test-results/translations` and the temporary fixture is removed.

Consumer v1 rejects relative Markdown image/media references, including reference images and static JSX assets. Their resolution base changes when a translation lives in the derived hash namespace. Absolute public or scheme-qualified sources are retained verbatim. `srcset` and dynamic JSX media references require a deliberate resolver and are unsupported in this slice. Native translated fixtures are local consumer capability evidence, not proof of an operating translation producer, current corpus translations, CI or deployment.
