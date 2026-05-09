// HTML standalone num iframe sandboxed.
// `sandbox="allow-scripts"` SEM `allow-same-origin` — JS roda mas não tem
// acesso ao parent ou cookies. Sem `allow-forms` nem `allow-popups` por
// default.

import { useEffect, useRef, useState } from "react";

export function HtmlRenderer({ source }: { source: string }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState<number>(360);

  useEffect(() => {
    const ifr = ref.current;
    if (!ifr) return;
    // srcDoc com a string — bypassa same-origin checks e o iframe fica isolado.
    ifr.srcdoc = source;
    // Tenta auto-ajustar altura quando carrega.
    const onLoad = () => {
      try {
        const doc = ifr.contentDocument;
        if (!doc) return;
        const h = Math.min(800, Math.max(120, doc.documentElement.scrollHeight + 8));
        setHeight(h);
      } catch {
        // sandbox bloqueou — mantém altura default
      }
    };
    ifr.addEventListener("load", onLoad);
    return () => {
      ifr.removeEventListener("load", onLoad);
    };
  }, [source]);

  return (
    <iframe
      ref={ref}
      title="HTML artifact"
      // Sandboxed: permite JS rodar mas sem acesso a same-origin.
      sandbox="allow-scripts"
      className="w-full bg-white"
      style={{ height: `${height}px` }}
    />
  );
}
