# openclaude-chat

Rich chat UI component — HTTP+SSE counterpart to [@codrstudio/openclaude-sdk](https://github.com/codrstudio/openclaude-sdk). Shadcn-native (consumes host tokens).

## Installation

### Recommended: shadcn registry (source copy)

Distribuímos via **shadcn registry**, no estilo `npx shadcn add`. Isso copia os arquivos
fonte direto pra `src/components/openclaude-chat/` do seu projeto — você é dono do código,
sem npm package opaco. Pode customizar via props (sem editar os arquivos copiados, que são
sobrescritos no próximo update).

#### Caminho A — shadcn CLI oficial (preferido)

Funciona quando seu `components.json` segue o schema padrão do shadcn:

```bash
# A partir do JSON publicado (URL ou caminho local):
npx shadcn@latest add ./path/to/registry/openclaude-chat.json --overwrite --yes
```

A CLI copia os 95 arquivos pra `src/components/openclaude-chat/`, instala as deps npm
necessárias (vaul, radix-ui, react-markdown, lucide-react, etc.) e respeita os aliases
do seu `components.json`.

#### Caminho B — installer fallback (`registry/install.mjs`)

A CLI do shadcn é estrita no schema do `components.json` e rejeita configs custom
(`style`, `iconLibrary`, `menuColor`, etc.). Se sua CLI dispara
`Invalid configuration found in components.json`, use o fallback:

```bash
# instala em ./src/components/openclaude-chat
node ./path/to/registry/install.mjs

# base custom (ex: monorepo com apps/)
node ./path/to/registry/install.mjs --target-base=apps/frontend

# preview sem escrever
node ./path/to/registry/install.mjs --dry-run
```

Depois, instale as deps npm manualmente — o script imprime o comando exato no fim.

#### Como obter o `openclaude-chat.json`

Opção 1 — clonar este repo e gerar localmente:

```bash
git clone https://github.com/codrstudio/openclaude-chat.git
cd openclaude-chat
npm install
npm run registry:build
# resultado em registry/openclaude-chat.json (+ registry/install.mjs + registry/README.md + registry/CHANGELOG.md)
```

Opção 2 — copiar o `registry/` da release (futuro) ou apontar pra URL pública (futuro).

#### Documentação completa

Ver [`registry/README.md`](./registry/README.md) — uso mínimo, pitfalls (ex: API keys
agent-scoped, manter overlays montados em erro do Chat) e [`registry/CHANGELOG.md`](./registry/CHANGELOG.md)
pro guia de migração entre versões.

### Alternativa: npm package (legacy)

Se preferir o modelo npm package (binário opaco, sem source copy), as opções clássicas
ainda funcionam:

```bash
# npm registry público
npm install @codrstudio/openclaude-chat

# GitHub Packages (requer autenticação com token de read:packages)
echo "@codrstudio:registry=https://npm.pkg.github.com" >> .npmrc
npm install @codrstudio/openclaude-chat

# Direct download (.tgz de release)
npm install https://github.com/codrstudio/openclaude-chat/releases/download/v0.4.0/codrstudio-openclaude-chat-0.4.0.tgz
```

Browse versões em [Releases](https://github.com/codrstudio/openclaude-chat/releases).

> **Nota**: o modelo npm não recebe os fixes/features mais recentes do registry. Sempre
> que possível, prefira o shadcn registry.

## Uso mínimo

```tsx
import {
  Chat,
  HistoryResponsive,
  ChatStarButton,
  ChatActionsResponsive,
  HistoryNewButton,
  HistoryProvider,
  createDefaultTransport,
} from "@/components/openclaude-chat" // (path muda se você customizou aliases)

const transport = createDefaultTransport("/api/v1/ai", API_KEY)

function ChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <HistoryProvider transport={transport} agentId="system.nic">
      <div className="flex min-h-0 flex-1 flex-col">
        <HistoryResponsive
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          activeConversationId={activeId}
          onSelectConversation={setActiveId}
          onNewConversation={setActiveId}
        />
        <Chat
          endpoint="/api/v1/ai"
          token={API_KEY}
          agentId="system.nic"   // ⚠️ obrigatório para api-keys agent-scoped
          sessionId={activeId ?? undefined}
          maxWidth="3xl"
        />
      </div>
    </HistoryProvider>
  )
}
```

> **Pitfall**: passe `agentId` em **duas pontas** — `<Chat agentId>` (cobre `ensureSession`)
> e `<HistoryProvider agentId>` (cobre o botão "Nova" interno ao `<History>`). Sem isso,
> requests com api-key agent-scoped retornam 403 forbidden. Detalhes em
> [`registry/README.md`](./registry/README.md).

## Demo de referência

Há um demo funcional consumindo o registry em `.tmp/demo-x` — frontend Vite + TanStack
Router + bookmarkable routes (`/chat-e/{uuid-titleSlug}` + search params para overlays).
Útil como template inicial.
