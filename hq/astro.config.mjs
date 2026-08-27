import { defineConfig } from "astro/config";

const publicBase = process.env.HQ_PUBLIC_BASE ?? "/";
const outDir = process.env.HQ_PUBLIC_OUT_DIR ?? "./dist";

export default defineConfig({
  site: "https://buildwithbpp.github.io",
  base: publicBase,
  outDir,
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory"
  }
});
