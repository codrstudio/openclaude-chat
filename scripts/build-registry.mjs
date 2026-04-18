// Gera registry.json na raiz do repo, listando todos os arquivos de src/
// como entradas registry:file com target sob components/openclaude-chat/.
//
// Uso: node scripts/build-registry.mjs
// (Tambem exposto como: npm run registry:source)
//
// O registry.json resultante e o INPUT do comando `shadcn build`, que
// gera os JSONs finais com o conteudo inlined em public/r/*.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const OUT = path.join(ROOT, "registry.json");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const absFiles = walk(SRC).sort();
const files = absFiles.map((abs) => {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  const relFromSrc = rel.replace(/^src\//, "");
  return {
    path: rel,
    type: "registry:file",
    target: `~/src/components/openclaude-chat/${relFromSrc}`,
  };
});

// Dependencias npm mirror das do package.json (o shadcn add instala no consumidor).
const dependencies = Object.keys(PKG.dependencies ?? {});

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "openclaude-chat",
  homepage: "https://github.com/codrstudio/openclaude-chat",
  items: [
    {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: "openclaude-chat",
      type: "registry:block",
      title: "Openclaude Chat",
      description:
        "Chat + History + ChatHeader triad. Ships vendored shadcn primitives under components/openclaude-chat/ui/ for full isolation.",
      dependencies,
      files,
    },
  ],
};

fs.writeFileSync(OUT, JSON.stringify(registry, null, 2) + "\n");
console.log(`registry.json escrito com ${files.length} arquivos`);
