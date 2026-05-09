/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const path: `${string}.svg`;
  export default path;
}

declare module "*.css";

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
