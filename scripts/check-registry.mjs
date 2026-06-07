// Gate de integridade do registry: garante que TODO arquivo de src/ está
// presente nos dois artefatos do registry — o input (registry.json) e o
// output consumido (registry/hammer-chat.json). Falha (exit 1) em qualquer
// MISSING (arquivo de src/ fora do registry) ou ORPHAN (registry lista
// arquivo que sumiu de src/).
//
// Uso: node scripts/check-registry.mjs   (ou: npm run registry:check)
//
// Por que existe: o registry é o canal de distribuição real (source-copy
// shadcn). Editar src/ e esquecer de rodar `registry:build` deixa o
// componente novo fora do canal que os consumidores usam — o sintoma é
// "criei o componente, buildei o dist, mas quem instala via registry não o
// vê". Este gate transforma esse esquecimento silencioso em erro ruidoso.
// `registry/hammer-chat.json` é o arquivo que o install.mjs lê; validá-lo
// pega tanto "esqueci registry:source" quanto "esqueci o shadcn build".

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function targetOf(abs) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  const relFromSrc = rel.replace(/^src\//, "");
  return `~/src/components/hammer-chat/${relFromSrc}`;
}

const srcTargets = new Set(walk(SRC).map(targetOf));

// Cada artefato do registry que precisa refletir src/ fielmente.
const artifacts = [
  { label: "registry.json (input)", file: path.join(ROOT, "registry.json"), pick: (j) => j.items?.[0]?.files ?? [] },
  { label: "registry/hammer-chat.json (consumido)", file: path.join(ROOT, "registry", "hammer-chat.json"), pick: (j) => j.files ?? [] },
];

let failed = false;

for (const { label, file, pick } of artifacts) {
  if (!fs.existsSync(file)) {
    console.error(`[check-registry] ${label} não existe — rode \`npm run registry:build\``);
    failed = true;
    continue;
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const targets = new Set(pick(json).map((f) => f.target));
  const missing = [...srcTargets].filter((t) => !targets.has(t)).sort();
  const orphan = [...targets].filter((t) => !srcTargets.has(t)).sort();

  if (missing.length === 0 && orphan.length === 0) {
    console.log(`[check-registry] OK — ${label}: ${targets.size} arquivos em dia.`);
    continue;
  }
  failed = true;
  for (const m of missing) console.error(`  MISSING  [${label}]  ${m}`);
  for (const o of orphan) console.error(`  ORPHAN   [${label}]  ${o}`);
}

if (failed) {
  console.error("\n[check-registry] registry desatualizado — rode `npm run registry:build` e commite.");
  process.exit(1);
}
console.log(`[check-registry] OK — registry em dia (${srcTargets.size} arquivos em src/).`);
