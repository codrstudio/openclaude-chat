// ===========================================================================
// parser.ts — Extrai tags <antArtifact> de uma string de TextBlock.
//
// O agente emite tags inline na resposta. Ex:
//
//   "Aqui o componente que você pediu:
//
//   <antArtifact identifier="counter" type="application/vnd.ant.react" title="Contador">
//   function App() { ... }
//   </antArtifact>
//
//   Pode iterar pedindo mudanças."
//
// O parser quebra a string em segmentos: { kind: 'text', value } |
// { kind: 'artifact', part: ArtifactPart }. Mantém ordem original — chat
// renderiza intercalado (Markdown component pra texto, ArtifactCard pra
// artifact).
// ===========================================================================

import type { ArtifactPart, ArtifactType } from "../types.js"

const KNOWN_TYPES: ReadonlySet<ArtifactType> = new Set<ArtifactType>([
  "application/vnd.ant.code",
  "text/markdown",
  "text/html",
  "image/svg+xml",
  "application/vnd.ant.mermaid",
  "application/vnd.ant.react",
])

export type Segment =
  | { kind: "text"; value: string }
  | { kind: "artifact"; part: ArtifactPart }

const OPEN_RE = /<antArtifact\b([^>]*)>/g
const CLOSE_TAG = "</antArtifact>"

/**
 * Quebra `text` em segmentos. Texto entre tags vai como `kind: 'text'`,
 * cada artifact válido vira `kind: 'artifact'`. Tags malformadas ficam
 * no texto bruto (degrade gracioso).
 */
export function parseArtifacts(text: string): Segment[] {
  if (!text || !text.includes("<antArtifact")) {
    return text ? [{ kind: "text", value: text }] : []
  }

  const segments: Segment[] = []
  let cursor = 0
  OPEN_RE.lastIndex = 0

  let openMatch: RegExpExecArray | null
  while ((openMatch = OPEN_RE.exec(text)) !== null) {
    const openStart = openMatch.index
    const openEnd = OPEN_RE.lastIndex
    const closeIdx = text.indexOf(CLOSE_TAG, openEnd)
    if (closeIdx === -1) {
      // Tag aberta sem fechamento — mantém tudo daí pra frente como texto bruto
      // e para. Pode acontecer durante streaming antes do close chegar.
      break
    }

    // Texto antes da tag
    if (openStart > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, openStart) })
    }

    const attrs = parseAttrs(openMatch[1] ?? "")
    const inner = text.slice(openEnd, closeIdx).replace(/^\r?\n/, "").replace(/\r?\n$/, "")

    const part = buildArtifactPart(attrs, inner)
    if (part) {
      segments.push({ kind: "artifact", part })
    } else {
      // Tag malformada (faltou identifier/type/title ou type desconhecido) —
      // mantém raw como texto pra não perder informação.
      segments.push({ kind: "text", value: text.slice(openStart, closeIdx + CLOSE_TAG.length) })
    }

    cursor = closeIdx + CLOSE_TAG.length
    OPEN_RE.lastIndex = cursor
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", value: text.slice(cursor) })
  }

  // Coalesce text segments
  const coalesced: Segment[] = []
  for (const seg of segments) {
    const last = coalesced[coalesced.length - 1]
    if (seg.kind === "text" && last && last.kind === "text") {
      last.value += seg.value
    } else {
      coalesced.push(seg)
    }
  }

  // Remove text segments que viraram só whitespace (entre artifacts)
  return coalesced.filter((s) => !(s.kind === "text" && s.value.trim() === ""))
}

/** Parsea atributos `key="value"` ou `key='value'`. Tolerante. */
function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([a-zA-Z_:][a-zA-Z0-9._:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const key = m[1]!
    const value = m[3] ?? m[4] ?? ""
    attrs[key] = value
  }
  return attrs
}

function buildArtifactPart(attrs: Record<string, string>, inner: string): ArtifactPart | null {
  const identifier = attrs["identifier"]?.trim()
  const rawType = attrs["type"]?.trim()
  const title = attrs["title"]?.trim()
  const language = attrs["language"]?.trim() || undefined

  if (!identifier || !rawType || !title) return null
  if (!KNOWN_TYPES.has(rawType as ArtifactType)) return null

  return {
    type: "artifact",
    identifier,
    artifactType: rawType as ArtifactType,
    title,
    ...(language ? { language } : {}),
    source: inner,
  }
}
