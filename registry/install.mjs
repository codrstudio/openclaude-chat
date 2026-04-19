#!/usr/bin/env node
// openclaude-chat registry installer (bypass shadcn CLI)
//
// Use este script quando o `npx shadcn add` rejeitar teu components.json
// (o CLI oficial e strict no schema — configs custom como `radix-nova`
// theme ou `phosphor` icon library quebram a validacao).
//
// Uso:
//   node install.mjs                              (instala em ./src/components/openclaude-chat)
//   node install.mjs --target-base=apps/frontend  (base custom pra resolver ~/)
//   node install.mjs --dry-run                    (preview do que seria escrito)
//   node install.mjs --skip-deps                  (nao imprime lista de deps)
//   node install.mjs --force                      (sobrescreve sem perguntar)
//
// O registry JSON e resolvido relativo a este script (esta no mesmo diretorio).

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
function flag(name, fallback = false) {
  const eq = args.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split("=").slice(1).join("=")
  if (args.includes(`--${name}`)) return true
  return fallback
}

const TARGET_BASE = path.resolve(String(flag("target-base", ".")))
const DRY_RUN = Boolean(flag("dry-run"))
const SKIP_DEPS = Boolean(flag("skip-deps"))
const FORCE = Boolean(flag("force"))

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_JSON = path.join(SCRIPT_DIR, "openclaude-chat.json")

if (!fs.existsSync(REGISTRY_JSON)) {
  console.error(`[install] registry nao encontrado: ${REGISTRY_JSON}`)
  process.exit(1)
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_JSON, "utf8"))
const files = registry.files ?? []
const deps = registry.dependencies ?? []

function resolveTarget(target) {
  // shadcn convention: "~/..." = project root
  const clean = String(target).replace(/^~[\\/]/, "")
  return path.join(TARGET_BASE, clean)
}

console.log(`[install] registry: ${registry.name}`)
console.log(`[install] target base: ${TARGET_BASE}`)
console.log(`[install] ${DRY_RUN ? "DRY RUN — " : ""}${files.length} arquivos, ${deps.length} deps`)
console.log()

let written = 0
let overwritten = 0
let skipped = 0

for (const file of files) {
  if (!file.target || typeof file.content !== "string") {
    console.warn(`[skip] missing target/content: ${file.path}`)
    skipped++
    continue
  }
  const abs = resolveTarget(file.target)
  const rel = path.relative(TARGET_BASE, abs).replace(/\\/g, "/")
  const exists = fs.existsSync(abs)

  if (exists && !FORCE && !DRY_RUN) {
    overwritten++
  }

  if (DRY_RUN) {
    console.log(`  would ${exists ? "overwrite" : "write"}: ${rel}`)
  } else {
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, file.content)
    console.log(`  ${exists ? "overwrote" : "wrote"}: ${rel}`)
  }
  written++
}

console.log()
console.log(
  `[install] ${DRY_RUN ? "would write" : "wrote"} ${written} arquivos` +
    (overwritten > 0 ? ` (${overwritten} sobrescritos)` : "") +
    (skipped > 0 ? `, ${skipped} pulados` : ""),
)

if (!SKIP_DEPS && deps.length > 0) {
  console.log()
  console.log(`[install] npm deps necessarias (${deps.length}):`)
  for (const d of deps) console.log(`  - ${d}`)
  console.log()
  console.log(`[install] rode isso no teu projeto:`)
  console.log(`  npm install ${deps.join(" ")}`)
}

if (DRY_RUN) {
  console.log()
  console.log(`[install] dry-run — nada foi escrito. remove --dry-run pra instalar.`)
}
