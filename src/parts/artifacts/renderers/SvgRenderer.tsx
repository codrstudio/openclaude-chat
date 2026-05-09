// SVG inline. Sanitização leve: remove <script>, on* handlers e
// xlink:href com javascript:. Confiança no agente é alta (system prompt
// proíbe JS no SVG), mas defesa em profundidade é barata.

import { useMemo } from "react";

function sanitizeSvg(src: string): string {
  let out = src;
  // Remove tags <script>...</script>
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove handlers on*=
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  // Remove javascript: em href/xlink:href
  out = out.replace(/(href|xlink:href)\s*=\s*"javascript:[^"]*"/gi, "");
  out = out.replace(/(href|xlink:href)\s*=\s*'javascript:[^']*'/gi, "");
  return out;
}

export function SvgRenderer({ source }: { source: string }) {
  const sanitized = useMemo(() => sanitizeSvg(source), [source]);
  return (
    <div
      className="w-full flex items-center justify-center bg-white p-4 [&_svg]:max-w-full [&_svg]:max-h-[600px] [&_svg]:h-auto"
      // SVG é contained — risco baixo após sanitização.
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
