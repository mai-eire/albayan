import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import serverBoundary from "./eslint/server-boundary.mjs";

export default defineConfig([
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    "next-env.d.ts",
  ]),
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    plugins: { albayan: { rules: { "server-boundary": serverBoundary } } },
    rules: { "albayan/server-boundary": "error" },
  },
]);
