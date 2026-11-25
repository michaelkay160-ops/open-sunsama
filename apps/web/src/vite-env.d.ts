/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_DISABLE_DESKTOP_UPDATES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
