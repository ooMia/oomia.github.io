# Publishing Site

Astro-based presentation and delivery repository for the Publishing Platform.

The Site consumes canonical content from `ooMia/oomia.github.io.docs` through the submodule mounted at `apps/web/data/articles`. The Article collection is intentionally limited to `content/articles/**/*.{md,mdx}`; other canonical Docs content is not treated as an Article implicitly.

## Repository responsibilities

- `apps/web`: Astro consumer, routes and rendering
- `packages/md`: Markdown/MDX processing owned by this Site codebase
- `packages/ui`: shared Site UI components
- `docs/content-consumption-contract.md`: observable input, rendering and publishability boundary
- `.github/workflows/deploy.yaml`: build verification and GitHub Pages delivery

Engine is optional and is not a Site runtime dependency. A canonical Docs revision is publishable only when the actual Site consumer accepts and builds it.

## Development

Initialize the canonical content submodule and install dependencies:

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
```

Run the repository checks through the existing workspace scripts:

```sh
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

For local web development:

```sh
pnpm dev
```

Local environment values can override the public URL/base path when needed:

```sh
SITE_URL=http://localhost:4321
BASE_PATH=/
```

## Content and delivery

See [Content consumption contract](docs/content-consumption-contract.md) for the current consumer boundary.

Pull requests to `develop` verify the production build path without mutating live GitHub Pages. Live deployment is reserved for the release branch path.
