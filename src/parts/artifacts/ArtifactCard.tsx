// Stub temporário — implementação completa vem na Fase C.
import type { ArtifactPart } from "../../types.js";

export function ArtifactCard({ part }: { part: ArtifactPart }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-xs">
      <div className="font-medium">{part.title}</div>
      <div className="opacity-70">type: {part.artifactType}</div>
    </div>
  );
}
