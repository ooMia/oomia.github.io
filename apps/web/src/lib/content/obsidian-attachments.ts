import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import type { MdastPluginEntry } from "@workspace/md"

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i

function isOutside(root: string, target: string) {
  const path = relative(root, target)
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)
}

function toPosix(path: string) {
  return path.split(sep).join("/")
}

export default function obsidianAttachments(assetRoot: URL): MdastPluginEntry {
  const assetRootPath = fileURLToPath(assetRoot)

  return ({ fileURL, source }) => {
    if (!fileURL) return null

    const documentDirectory = dirname(fileURLToPath(fileURL))

    return {
      name: "obsidian-attachments",
      options: { position: true },
      image(node, ctx) {
        const position = node.position
        if (!position) return

        const raw = source.slice(position.start.offset, position.end.offset)
        if (!raw.startsWith("![[")) return

        const url = node.url
        if (!url || URL_SCHEME.test(url) || url.startsWith("/") || url.startsWith("#")) {
          return
        }

        const attachment = resolve(assetRootPath, url)
        if (isOutside(assetRootPath, attachment)) return

        const rewritten = toPosix(relative(documentDirectory, attachment))
        ctx.setField(
          node,
          "url",
          rewritten.startsWith(".") ? rewritten : `./${rewritten}`
        )
      },
    }
  }
}
