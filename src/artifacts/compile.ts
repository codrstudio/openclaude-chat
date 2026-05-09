// ===========================================================================
// compile.ts — Transpile JSX → JS e valida ausência de constructs proibidos.
//
// Estratégia:
// 1. transpile JSX/TS → JS via sucrase (sem typecheck)
// 2. valida o JS resultante com regex em palavras-fronteira
//
// Regex é suficiente porque o escopo de execução também não expõe nenhum
// dos identifiers proibidos — o validator é defesa-em-profundidade, não
// fronteira de segurança. A fronteira é o `scope` do `new Function`.
// ===========================================================================

import { transform } from "sucrase"

// Construções proibidas no código de artifact React. A "verdade" semântica
// fica no skill body do SDK (que ensina o agente); este array é a defesa
// em profundidade do cliente — espelha-o conceitualmente, mas o cliente
// é a única fronteira que importa pra segurança.
const FORBIDDEN_CONSTRUCTS = [
  { name: "while", description: "while loops (incluindo while(true))" },
  { name: "for", description: "for loops sem bound estático" },
  { name: "do", description: "do/while loops" },
  { name: "setInterval", description: "Timers periódicos" },
  { name: "setTimeout", description: "Timers" },
  { name: "eval", description: "Avaliação dinâmica de código" },
  { name: "Function", description: "new Function(...) constructor" },
  { name: "Worker", description: "Web Workers" },
  { name: "fetch", description: "fetch direto (artifacts são self-contained)" },
  { name: "XMLHttpRequest", description: "Requisições HTTP diretas" },
  { name: "document", description: "Acesso direto ao DOM" },
  { name: "window", description: "Acesso direto a window globals" },
  { name: "localStorage", description: "Storage do browser" },
  { name: "sessionStorage", description: "Storage do browser" },
  { name: "import", description: "Imports dinâmicos" },
  { name: "require", description: "CommonJS imports" },
] as const

export interface CompileResult {
  /** JS final — wrappable em `new Function("scope", code)`. */
  code: string
  /** Avisos não fatais (ex: identificador suspeito mas em string). */
  warnings: string[]
}

export class CompileError extends Error {
  readonly stage: "transpile" | "validate"
  readonly violations?: string[]
  constructor(message: string, stage: "transpile" | "validate", violations?: string[]) {
    super(message)
    this.name = "CompileError"
    this.stage = stage
    this.violations = violations
  }
}

const FORBIDDEN_PATTERNS = FORBIDDEN_CONSTRUCTS.map((c) => ({
  name: c.name,
  description: c.description,
  // \b{name}\b — palavra inteira; escape pra .
  re: new RegExp(`\\b${c.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`),
}))

/**
 * Compila um arquivo TSX/JSX para JS executável.
 *
 * @param source código-fonte (TSX, JSX ou JS)
 * @param filename nome para mensagens de erro (não é caminho real)
 */
export function compile(source: string, filename = "App.tsx"): CompileResult {
  let transpiled: string
  try {
    const out = transform(source, {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "classic",
      production: true,
      filePath: filename,
    })
    transpiled = out.code
  } catch (err) {
    throw new CompileError(
      `Falha ao transpilar ${filename}: ${err instanceof Error ? err.message : String(err)}`,
      "transpile",
    )
  }

  const violations = validate(transpiled)
  if (violations.length > 0) {
    throw new CompileError(
      `Construções proibidas em ${filename}: ${violations.join(", ")}`,
      "validate",
      violations,
    )
  }

  return { code: transpiled, warnings: [] }
}

/** Procura identificadores proibidos no código transpilado. */
export function validate(code: string): string[] {
  // Remove comments e strings pra reduzir falsos positivos. Conservador:
  // strings entre aspas duplas/simples/template; comments // e /* */.
  const stripped = stripStringsAndComments(code)
  const found: string[] = []
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    if (re.test(stripped)) found.push(name)
  }
  return found
}

function stripStringsAndComments(src: string): string {
  let out = ""
  let i = 0
  const n = src.length
  while (i < n) {
    const ch = src[i]!
    const next = src[i + 1]
    // line comment
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++
      continue
    }
    // block comment
    if (ch === "/" && next === "*") {
      i += 2
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++
      i += 2
      continue
    }
    // single/double/template string
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch
      i++
      while (i < n) {
        const c = src[i]!
        if (c === "\\") {
          i += 2
          continue
        }
        if (c === quote) {
          i++
          break
        }
        i++
      }
      continue
    }
    out += ch
    i++
  }
  return out
}
