# hammer-chat

Rich chat UI component — HTTP+SSE counterpart to [@codrstudio/hammer-sdk](https://github.com/codrstudio/hammer-sdk).

> **Instale via registry shadcn (source-copy) — é assim que a lib é distribuída.** O `install.mjs` (ou `npx shadcn add`) copia os fontes TSX para `src/components/hammer-chat/` do seu projeto, onde o Tailwind v4 do host já os escaneia via `@source` — então o `<Chat>` nasce com estilos corretos e adotando os tokens do seu tema.
>
> **Diagnóstico rápido:** se o `<Chat>` aparecer sem estilos, a causa provável é consumo via npm (`node_modules/@codrstudio/hammer-chat/dist/*.js` — JS já compilado, sem TSX, fora do scan do Tailwind). A correção é migrar para o caminho source-copy abaixo. O pacote publica `dist/` apenas para tipos e import direto em contextos não-Tailwind; a renderização estilizada vem do source-copy.

Consome tokens shadcn do host (`--background`, `--foreground`, `--primary`, etc.) — adota a identidade visual do app onde é montado, sem cor própria.

## Instalação

Pré-requisitos no projeto host:
- React 18 ou 19
- Tailwind v4 (via `@tailwindcss/vite` ou equivalente)
- `components.json` no formato shadcn padrão (`npx shadcn@latest init` se ainda não tiver)

### Caminho A — shadcn CLI (preferido)

```bash
npx shadcn@latest add https://github.com/codrstudio/hammer-chat/raw/main/registry/hammer-chat.json --overwrite --yes
```

A CLI:
- copia os 84 arquivos para `src/components/hammer-chat/` (ou onde seu `components.json` apontar)
- atualiza `package.json` com as dependências npm necessárias
- respeita os aliases do seu `components.json`

### Caminho B — installer fallback

A CLI do shadcn rejeita `components.json` com campos custom (ex: `style: "radix-nova"`, `iconLibrary: "phosphor"`). Se sua CLI dispara `Invalid configuration found in components.json`, use o installer fallback:

```bash
# instala em ./src/components/hammer-chat
node ./registry/install.mjs

# base custom (ex: monorepo com apps/)
node ./registry/install.mjs --target-base=apps/frontend

# preview sem escrever nada
node ./registry/install.mjs --dry-run
```

Depois instale as deps npm: o `install.mjs` imprime o comando `npm install …` exato (24 pacotes) ao final da execução — copie de lá, assim a lista acompanha o registry e nunca desatualiza.

### Estrutura instalada

```
src/components/hammer-chat/      # 84 arquivos
├── index.ts                 # barrel — importe daqui
├── types.ts
├── transport.ts
├── styles.css               # tokens default + mapping @theme inline
├── components/              # <Chat>, <ChatHeader>, <History*>, AuthConfig, ... (+ history/)
├── hooks/                   # ChatProvider, HistoryProvider, useModels, ...
├── i18n/                    # en-US, pt-BR, es-ES
├── lib/                     # utils (cn), sdk-to-message
├── parts/                   # PartRenderer, ReasoningBlock, TaskCard, ... (+ artifacts/)
├── artifacts/               # AppHost, compile, parser, runtime (React ao vivo)
└── ui/                      # 19 shadcn primitives vendored (button, badge, card, ...)
```

### Atualização

Quando o registry receber um update (novo `hammer-chat.json`), rode de novo o comando de instalação — os arquivos em `src/components/hammer-chat/` são sobrescritos.

> **Customize via props dos componentes e via tokens do seu tema** (`--primary`, `--radius`, etc.). Por serem sobrescritos a cada update, trate os arquivos em `src/components/hammer-chat/` como gerados: se precisar de um comportamento que as props não cobrem, abra issue/PR no repo do hammer-chat para que a mudança entre pelo registry.

## Uso mínimo

```tsx
import { useState, useMemo, useEffect } from "react"
import {
  Chat,
  HistoryProvider,
  HistorySidebar,
  HistoryTrigger,
  createDefaultTransport,
} from "@/components/hammer-chat"

const ENDPOINT = "/api/v1/ai"

export function App() {
  const transport = useMemo(() => createDefaultTransport(ENDPOINT), [])
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) return
    fetch(`${ENDPOINT}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "nic" }),
    })
      .then((r) => r.json())
      .then((d) => setSessionId(d.sessionId))
  }, [sessionId])

  return (
    <HistoryProvider
      transport={transport}
      agentId="nic"
      activeConversationId={sessionId}
      onActiveChange={setSessionId}
    >
      <HistoryTrigger />
      <HistorySidebar />
      <Chat
        endpoint={ENDPOINT}
        transport={transport}
        sessionId={sessionId ?? undefined}
        agentId="nic"
        sessionOptions={{ permissionMode: "bypassPermissions" }}
      />
    </HistoryProvider>
  )
}
```

## Servidor (a ponte)

`<Chat>` fala um contrato HTTP+SSE específico (`POST /conversations`,
`POST /messages` com SSE, `GET /messages` pra replay, etc.). O servidor
fica do lado do consumer e usa **`@codrstudio/hammer-sdk`** (`createMultiSessionPool`,
`createPersistentSession`).

Implementação de referência completa: ver [README do SDK — seção
"Bridge para `@codrstudio/hammer-chat`"](https://github.com/codrstudio/hammer-sdk#bridge-para-codrstudiohammer-chat).

## Pitfalls

### Api keys agent-scoped — sempre propague `agentId` em duas pontas

Se sua api-key só autoriza agentes específicos (ex: `allowed-agents: ["system.nic"]`), o backbone retorna **HTTP 403** ao tentar criar conversa sem `agentId` explícito.

Dois caminhos criam conversa dentro da lib; **ambos precisam do `agentId`**:

1. **`<Chat>` `ensureSession`** (quando montado sem `sessionId`): use a prop `agentId` do próprio Chat.
2. **`<History>` botão "Nova"** (interno ao painel de histórico): use `<HistoryProvider agentId="...">`.

```tsx
<HistoryProvider transport={transport} agentId="system.nic">
  <Chat agentId="system.nic" ... />
  <HistorySidebar />
</HistoryProvider>
```

### Mantenha overlays secundários montados mesmo em erro do Chat

Early-return de erro desmonta `<HistorySidebar>`, `<ChatActionsResponsive>` ou qualquer affordance no breadcrumb, prendendo o usuário no estado de erro sem escape. Renderize os containers fora do branch de erro.

**Anti-pattern:**

```tsx
function ChatPage() {
  if (error) return <ErrorView />  // ❌ desmontou History + Menu
  return (
    <>
      <HistorySidebar ... />
      <Chat ... />
    </>
  )
}
```

**Pattern correto:**

```tsx
function ChatPage() {
  return (
    <>
      <HistorySidebar ... />
      {error ? <ErrorView /> : <Chat ... />}
    </>
  )
}
```

## Styling recipe

Tema claro/escuro funcional, mesma identidade visual do app host, e suporte
a Module Federation: ver [`skills/hammer-chat-styling/SKILL.md`](./skills/hammer-chat-styling/SKILL.md).

A skill cobre as três armadilhas mais comuns ao integrar o `<Chat>` em um
host real:

1. **`@theme { --color-X: var(--X) }` congela o valor no `:root`** —
   resolução do `var()` acontece no `:root`, ignora `body.light`. Trocar
   por **`@theme inline`** faz Tailwind expandir a indireção no ponto de
   uso (lazy lookup, respeita cascade).
2. **Tokens duplicados em pacotes filhos sobrescrevem o host** — em
   monorepos / micro-frontends, manter `:root { --background: ... }`
   apenas no host. Pacotes filhos só fazem o mapping `@theme inline`.
3. **`@originjs/vite-plugin-federation` não carrega o CSS do remote** —
   o host recebe só o JS exposed. Configurar `cssCodeSplit: false` +
   `assetFileNames` no remote (nome estável `assets/styles.css`) e
   injetar `<link rel="stylesheet">` no host antes de montar o componente
   federado.

A skill é distribuída como [Anthropic Skill](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview)
— copie `skills/hammer-chat-styling/` para `~/.claude/skills/` (ou
para o `.claude/skills/` do seu projeto) e o Claude Code aplica
automaticamente o pattern quando você integrar o `<Chat>`.

## Mantendo a lib (pipeline do registry)

Esta lib tem **dois canais de distribuição**, ambos derivados de `src/`:

- **registry source-copy** (`registry/hammer-chat.json`) — o canal que os consumidores usam (`install.mjs` / `npx shadcn add`). É a entrega real.
- **npm dist** (`dist/`) — bundle ESM + tipos, para import direto/typecheck.

`src/` é a única fonte da verdade. O gerador (`scripts/build-registry.mjs`) faz `walk(src/)` automático — todo `.tsx/.ts/.css` em `src/` entra no registry sem lista manual. A regra de ouro: **uma mudança em `src/` só está entregue quando o registry foi regenerado.**

### Fluxo ao adicionar ou editar um componente

```bash
# 1. edite/crie em src/ e exporte no barrel src/index.ts
# 2. regenere os dois canais + valide, num passo só:
npm run build        # = tsup (dist) + registry:build + registry:check
```

`npm run build` está acoplado de propósito: buildar o dist **sempre** regenera o registry e roda o gate. Isso fecha a porta para o estado "dist novo, registry stale" (em que o componente existe no canal npm mas some no canal real que os usuários consomem).

### Definition of Done — componente no hammer-chat

Um componente novo só está pronto quando todos passam:

1. Arquivo em `src/` e exportado no barrel `src/index.ts`
2. `npm run registry:check` passa (o componente aparece em `registry.json` **e** `registry/hammer-chat.json`)
3. Deps npm novas declaradas em `package.json` (o gerador as espelha no registry automaticamente)
4. Instalado via `install.mjs` num projeto limpo, o componente é copiado e o barrel o exporta
5. Renderiza com estilo no **canal source-copy** (não validar só por import npm — o estilo correto vem do source-copy)

### Gate de integridade

```bash
npm run registry:check   # falha (exit 1) se src/ divergir de qualquer artefato do registry
```

Liste MISSING (arquivo de `src/` ausente do registry) e ORPHAN (registry aponta arquivo que sumiu de `src/`). Rode em CI e antes de publicar para garantir que o canal real reflete `src/`.

## Compatibilidade

- React 18 ou 19
- Tailwind v4
- Node 20+ pra rodar `install.mjs`
- CSS variables do shadcn (theme padrão — `--background`, `--foreground`, `--primary`, `--radius`, etc.)

## Versões

Browse todas as releases em [GitHub Releases](https://github.com/codrstudio/hammer-chat/releases).
