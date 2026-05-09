# openclaude-chat

Rich chat UI component — HTTP+SSE counterpart to [@codrstudio/openclaude-sdk](https://github.com/codrstudio/openclaude-sdk).

> **Esta lib é distribuída como registry shadcn (source-copy), não como pacote npm de runtime.** O motivo é técnico: a lib usa Tailwind v4, que gera utilidades escaneando o TSX em build-time via `@source`. Instalar como npm dep colocaria os arquivos em `node_modules/@codrstudio/openclaude-chat/dist/*.js` (sem TSX), fora do escopo de scan do Tailwind do host — e o `<Chat>` renderiza sem estilos. A instalação shadcn-way copia os fontes pra `src/`, onde o Tailwind do host já escaneia. **Não use `npm install`.**

Consome tokens shadcn do host (`--background`, `--foreground`, `--primary`, etc.).

## Instalação

Pré-requisitos no projeto host:
- React 18 ou 19
- Tailwind v4 (via `@tailwindcss/vite` ou equivalente)
- `components.json` no formato shadcn padrão (`npx shadcn@latest init` se ainda não tiver)

### Caminho A — shadcn CLI (preferido)

```bash
npx shadcn@latest add https://github.com/codrstudio/openclaude-chat/raw/main/registry/openclaude-chat.json --overwrite --yes
```

A CLI:
- copia os 95 arquivos para `src/components/openclaude-chat/` (ou onde seu `components.json` apontar)
- atualiza `package.json` com as dependências npm necessárias
- respeita os aliases do seu `components.json`

### Caminho B — installer fallback

A CLI do shadcn rejeita `components.json` com campos custom (ex: `style: "radix-nova"`, `iconLibrary: "phosphor"`). Se sua CLI dispara `Invalid configuration found in components.json`, use o installer fallback:

```bash
# instala em ./src/components/openclaude-chat
node ./registry/install.mjs

# base custom (ex: monorepo com apps/)
node ./registry/install.mjs --target-base=apps/frontend

# preview sem escrever nada
node ./registry/install.mjs --dry-run
```

Depois instale as deps npm manualmente (o script imprime o comando exato no final):

```bash
npm install react-markdown remark-gfm rehype-highlight @tanstack/react-virtual lucide-react \
  class-variance-authority clsx tailwind-merge recharts embla-carousel-react cmdk \
  @radix-ui/react-alert-dialog @radix-ui/react-collapsible @radix-ui/react-context-menu \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover \
  @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-tooltip \
  framer-motion sucrase vaul
```

### Estrutura instalada

```
src/components/openclaude-chat/
├── index.ts                 # barrel — importe daqui
├── types.ts
├── transport.ts
├── styles.css
├── components/              # <Chat>, <History>, <ChatHeader>, ...
├── display/                 # 20 display renderers
├── hooks/                   # ChatProvider, HistoryProvider, ...
├── i18n/                    # en-US, pt-BR, es-ES + custom
├── lib/
├── parts/                   # PartRenderer, ReasoningBlock, ...
└── ui/                      # 17 shadcn primitives vendored
```

### Atualização

Quando o registry receber um update (novo `openclaude-chat.json`), basta rodar de novo o comando de instalação. Os arquivos em `src/components/openclaude-chat/` são sobrescritos.

> **Não edite os arquivos em `src/components/openclaude-chat/` — modificações são perdidas no próximo update.** Toda customização deve passar por props dos componentes.

## Uso mínimo

```tsx
import { useState, useMemo, useEffect } from "react"
import {
  Chat,
  HistoryProvider,
  HistorySidebar,
  HistoryTrigger,
  createDefaultTransport,
} from "@/components/openclaude-chat"

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
fica do lado do consumer e usa **`@codrstudio/openclaude-sdk`** (`createMultiSessionPool`,
`createPersistentSession`).

Implementação de referência completa: ver [README do SDK — seção
"Bridge para `@codrstudio/openclaude-chat`"](https://github.com/codrstudio/openclaude-sdk#bridge-para-codrstudioopenclaude-chat).

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

## Compatibilidade

- React 18 ou 19
- Tailwind v4
- Node 20+ pra rodar `install.mjs`
- CSS variables do shadcn (theme padrão — `--background`, `--foreground`, `--primary`, `--radius`, etc.)

## Versões

Browse todas as releases em [GitHub Releases](https://github.com/codrstudio/openclaude-chat/releases).
