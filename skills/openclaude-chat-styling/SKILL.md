---
name: hammer-chat-styling
description: >
  Padrao de estilo para `@codrstudio/hammer-chat` que entrega tema
  claro/escuro funcional, mesma identidade visual do app host, e suporte a
  cenarios de Module Federation. Use sempre que o usuario integrar
  `<Chat>` em qualquer projeto e pedir: tema dark/light no chat, "deixe o
  chat com a cara do meu app", chat sem estilo / sem fundo / com texto
  cinza claro em background branco, classes do Tailwind nao aplicadas no
  chat (`.hidden` ignorado, `dark:` sem efeito), inputs `<input type=file>`
  aparecendo crus, integrar o chat em iframe ou em host federado, garantir
  que toggle claro/escuro afeta o chat. Tambem use quando: configurar
  Tailwind v4 com `@theme` para o chat, descobrir por que mudar de tema no
  host nao muda o chat, ajustar paleta do chat para combinar com o resto
  da UI, ou empacotar o chat como remote federado (Vite plugin federation).
---

# hammer-chat — styling pattern

## O que entrega

Um setup minimo, agnostico ao tipo de app (SPA standalone, micro-frontend
federado, embed em iframe), que faz o `<Chat>` herdar tema/identidade
visual do host **e** responder ao toggle claro/escuro em runtime.

## Tres camadas de problema (e fix)

A lib `@codrstudio/hammer-chat` consome **tokens shadcn do host**
(`--background`, `--foreground`, `--primary`, `--card`, `--border`,
`--ring`, etc.). Quem instala precisa entregar esses tokens **e** garantir
que eles re-resolvem quando o tema muda. Tres armadilhas tipicas:

### 1. Indireção `@theme { --color-X: var(--X) }` — congela o valor em `:root`

Esse e o bug mais comum. O recipe padrao de shadcn manda escrever:

```css
:root { --background: oklch(0.13 0.02 285); }
.dark { --background: oklch(0.13 0.02 285); }
.light { --background: oklch(0.99 0 0); }

@theme {
  --color-background: var(--background);  /* <-- problema */
}
```

Tailwind v4 transforma esse `@theme` em `:root, :host { --color-background:
var(--background) }`. O `var(--background)` **resolve no contexto do
`:root`**, que so conhece o valor `dark`. O `--color-background` fica
congelado em dark, mesmo quando `body.light` muda `--background` mais
abaixo na cascata. Resultado: `bg-background` sempre dark.

**Fix:** trocar `@theme` por `@theme inline`. Com `inline`, Tailwind
expande `var(--background)` direto no ponto de uso (`.bg-background {
background-color: var(--background) }`). A resolucao vira lazy e respeita
o `body.light`.

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius: var(--radius);
}
```

### 2. Em arquiteturas multi-app, tokens duplicados sobrescrevem o host

Se o chat vive em **outro pacote** (micro-frontend, federado, SPA num
iframe na mesma origem) e cada pacote redefine `:root { --background:
... }`, o ultimo CSS a carregar vence. O chat acaba pintando suas proprias
cores em vez de herdar do host.

**Fix:** tokens (valores das cores) vivem **so no host**. Pacotes filhos
mantem apenas o `@theme inline { ... }` mapeando para `var(--background)`
etc. As vars sao herdadas pelo DOM compartilhado via cascata CSS.

```css
/* No host (uma vez): */
:root { --background: oklch(0.13 0.02 285); --foreground: oklch(0.97 0 0); ... }
.light { --background: oklch(0.99 0 0); --foreground: oklch(0.18 0.02 285); ... }

/* No pacote do chat (e em qualquer outro filho): */
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));
@theme inline { /* so o mapping, sem :root */
  --color-background: var(--background);
  /* ... */
}
```

### 3. Module Federation NAO carrega o CSS do remote

Bug conhecido do `@originjs/vite-plugin-federation`: o host faz
`import("chat/App")` e recebe so o JS exposed. O CSS bundle do remote
(`dist/assets/index-*.css`) fica orfao. Sintomas: `.hidden` nao esconde,
`.bg-card` nao pinta, ate `<input type="file">` aparece com chrome nativo.

**Fix em duas partes:**

(a) Vite config do remote — emitir CSS com nome estavel:

```ts
// apps/chat/vite.config.ts
export default defineConfig({
  // ...
  build: {
    target: "esnext",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (info) =>
          info.name?.endsWith(".css")
            ? "assets/styles.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
```

(b) Host injeta `<link>` antes de montar o componente federado:

```tsx
// FederatedApp.tsx
import { useEffect } from "react";

function useRemoteStylesheet(slug: string, baseUrl: string) {
  useEffect(() => {
    const id = `fed-css-${slug}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `${baseUrl}/${slug}/assets/styles.css`;
    document.head.appendChild(link);
  }, [slug, baseUrl]);
}
```

Sem o CSS do remote injetado, o chat renderiza com ~half-styles (apenas
o que o CSS do host casualmente cobre via libs como vaul/radix).

## Receita completa de integracao

Para um host novo (SPA Vite + React 19 + Tailwind v4):

```tsx
// 1. ThemeProvider minimo (toggle dark/light)
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "dark",
  );
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  );
}
export const useTheme = () => {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("ThemeProvider missing");
  return c;
};
```

```css
/* 2. styles.css do host */
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.13 0.02 285);
  --foreground: oklch(0.97 0 0);
  --card: oklch(0.18 0.02 285);
  --card-foreground: oklch(0.97 0 0);
  --popover: oklch(0.18 0.02 285);
  --popover-foreground: oklch(0.97 0 0);
  --primary: oklch(0.7 0.18 290);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.25 0.02 285);
  --secondary-foreground: oklch(0.97 0 0);
  --muted: oklch(0.22 0.02 285);
  --muted-foreground: oklch(0.7 0.02 285);
  --accent: oklch(0.32 0.05 290);
  --accent-foreground: oklch(0.97 0 0);
  --destructive: oklch(0.55 0.22 25);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(0.28 0.02 285);
  --input: oklch(0.22 0.02 285);
  --ring: oklch(0.7 0.18 290);
  --radius: 0.625rem;
}

.light {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.18 0.02 285);
  --card: oklch(0.98 0.01 285);
  --card-foreground: oklch(0.18 0.02 285);
  --popover: oklch(0.99 0 0);
  --popover-foreground: oklch(0.18 0.02 285);
  --primary: oklch(0.6 0.18 290);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.95 0.01 285);
  --secondary-foreground: oklch(0.2 0.02 285);
  --muted: oklch(0.95 0.01 285);
  --muted-foreground: oklch(0.45 0.02 285);
  --accent: oklch(0.93 0.02 290);
  --accent-foreground: oklch(0.2 0.02 285);
  --border: oklch(0.9 0.01 285);
  --input: oklch(0.93 0.01 285);
  --ring: oklch(0.6 0.18 290);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius: var(--radius);
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

```tsx
// 3. Body class drive: ThemeProvider acima ja faz isso.
//    O <Chat> herda tudo via tokens.

import { Chat, LocaleProvider, HistoryProvider, createDefaultTransport } from "@/components/hammer-chat";

export function App() {
  const transport = useMemo(() => createDefaultTransport("/api/v1/ai"), []);
  return (
    <ThemeProvider>
      <LocaleProvider locale="pt-BR">
        <HistoryProvider transport={transport} agentId="meu-agente">
          <Chat endpoint="/api/v1/ai" agentId="meu-agente" locale="pt-BR" />
        </HistoryProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
```

## Trocando a paleta

Esse pattern e brand-agnostic — a estrutura e fixa, os valores `oklch(...)`
sao quem define a cara. Trocar paleta = trocar L e H mantendo C parecido.
Exemplos:

- Violeta (default acima): hue 285/290
- Esmeralda: hue 170 (turquesa) + 175 (neutros)
- Rose/coral: hue 345/350
- Azul corporate: hue 240

Para escolher cores harmonicas dentro dessa estrutura, ver skill
`semantic-palette`.

## Checklist de diagnostico

Quando o chat aparece "fora do tema":

1. **`:root` esta definido?** `getComputedStyle(document.body).getPropertyValue('--background')` retorna valor?
2. **`@theme inline` (nao apenas `@theme`)?** Procure por `--color-background: var(--background)` no CSS gerado. Se vier dentro de um `:root, :host`, o `inline` esta faltando.
3. **Body tem class `dark` ou `light`?** Se nao, o `.light { ... }` nunca aplica.
4. **Tokens duplicados em pacotes filhos?** Grep por `--background:` em todos os `styles.css` — so o host pode definir.
5. **Federado: CSS do remote carregou?** `document.getElementById('fed-css-<slug>')` existe? Total de `cssRules` aumentou apos o remote montar?

## Cenarios em que esse pattern foi validado

- SPA standalone Vite + React 19 + Tailwind v4
- Shell + apps em iframe na mesma origem (cookie httpOnly atravessa)
- Shell + apps federados via `@originjs/vite-plugin-federation` (com a
  injeção de `<link>` da camada 3)

## Skills relacionadas

- `semantic-palette` — paleta categorica OKLCH (avatares, tags, badges)
- `skill-creator` — criar/refinar skills
