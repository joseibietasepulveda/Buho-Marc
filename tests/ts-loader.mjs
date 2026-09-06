import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return next("next/server.js", context);
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const url = new URL(specifier, context.parentURL);
    if (existsSync(fileURLToPath(new URL(`${url.href}.ts`)))) return next(`${url.href}.ts`, context);
    if (existsSync(fileURLToPath(new URL(`${url.href}/index.ts`)))) return next(`${url.href}/index.ts`, context);
  }
  return next(specifier, context);
} });
