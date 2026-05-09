// Renderer de source code — reusa a Markdown component (que já tem
// rehype-highlight) embrulhando num fence com a language declarada.

import { Markdown } from "../../../components/Markdown.js";

export function CodeRenderer({ source, language }: { source: string; language: string }) {
  const fenceLang = language || "plaintext";
  const fenced = "```" + fenceLang + "\n" + source + "\n```";
  return (
    <div className="px-0 py-0 text-xs [&_pre]:!my-0 [&_pre]:!rounded-none [&_pre]:!border-0">
      <Markdown>{fenced}</Markdown>
    </div>
  );
}
