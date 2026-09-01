interface ImportMetaEnv {
  readonly SITE_URL?: string;
  readonly BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
