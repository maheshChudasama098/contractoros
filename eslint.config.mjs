import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  // Architecture boundaries (see docs/architecture.md).
  {
    files: ["src/web/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@server/*", "@prisma/client", "**/server/**"], message: "web must not import server code. Call the API or use @shared contracts." },
      ] }],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@server/*", "@web/*", "@prisma/client", "react", "next/*"], message: "shared must stay framework-free and side-agnostic." },
      ] }],
    },
  },
  {
    files: ["src/server/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@web/*"], message: "server must not import web code." },
        { group: ["@server/modules/*/*"], message: "Import a module through its index.ts (public API) only." },
      ] }],
    },
  },
];

export default eslintConfig;
