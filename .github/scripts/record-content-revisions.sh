#!/usr/bin/env bash
set -euo pipefail

docs="apps/web/data/articles"
site_sha="$(git rev-parse HEAD)"
docs_sha="$(git -C "$docs" rev-parse HEAD)"
pinned_sha="$(git ls-tree HEAD -- "$docs" | awk '{print $3}')"
test "$(git -C "$docs" rev-parse --is-shallow-repository)" = "false"
printf 'Site-SHA=%s\nDocs-SHA=%s\nSite-gitlink=%s\n' "$site_sha" "$docs_sha" "$pinned_sha"
{
  printf '## Content revisions\n\n'
  printf -- '- Site revision: `%s`\n' "$site_sha"
  printf -- '- Docs revision used: `%s`\n' "$docs_sha"
  printf -- '- Site gitlink: `%s`\n' "$pinned_sha"
} >> "$GITHUB_STEP_SUMMARY"
# Include the actual content revision in Turbo's build cache key.
printf 'DOCS_CHECKOUT_REVISION=%s\n' "$docs_sha" >> "$GITHUB_ENV"
