import { defineConfig } from "tsup"

// Builda o package em modo dual:
// - dist/index.js (ESM) + dist/index.d.ts (types) → consumidores via tarball
// - src/ continua intocado → consumidores shadcn way (via registry)
//
// Aliases `.js` → `.ts` resolution: tsup respeita imports com sufixo .js
// (NodeNext convention) e os mapeia pras fontes .ts. Externals = peerDeps
// + deps que não queremos bundlar (radix, etc.) — consumidor instala via
// npm normalmente.

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // tudo que o package importa fica external — não bundlamos as deps,
  // o consumer é responsável de tê-las (npm install resolve via tarball deps).
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ],
  // Marca tudo do node_modules como external — bundle só nosso source
  skipNodeModulesBundle: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
})
