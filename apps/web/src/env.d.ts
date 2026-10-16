/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Build-derived actual Docs HEAD, e.g. a 40-character lowercase Git SHA.
   * Set by astro.config.mts after checkout validation; never an environment override.
   * User-supplied server settings are typed by Astro's generated astro:env/server.
   */
  readonly DOCS_REVISION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
