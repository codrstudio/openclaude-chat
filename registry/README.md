# @codrstudio/openclaude-chat — Registry

Distribuição shadcn-style (source copy) da triad Chat + History + ChatHeader
mais seus envelopes responsivos.

## Conteúdo

- `openclaude-chat.json` — manifest com todos os arquivos inlined (~360KB, 95 arquivos)
- `install.mjs` — installer fallback que bypassa a CLI oficial do shadcn
- `README.md` — este arquivo

## Como instalar

Você tem **2 caminhos**. Escolhe o que funciona pro teu projeto.

### Caminho A — shadcn CLI oficial (preferido)

Funciona quando teu `components.json` segue o schema padrão do shadcn.

```bash
npx shadcn@latest add ./path/to/openclaude-chat.json --overwrite --yes
```

ou, se você copiou o JSON pro teu repo:

```bash
npx shadcn@latest add ./vendor/openclaude-chat.json --overwrite --yes
```

A CLI:
- Copia os 95 arquivos para `src/components/openclaude-chat/`
- Atualiza teu `package.json` com as deps npm
- Respeita teus aliases de `components.json`

### Caminho B — installer fallback (shadcn CLI recusou)

A CLI do shadcn rejeita `components.json` com campos custom (ex: `style: "radix-nova"`,
`iconLibrary: "phosphor"`, `menuColor`, `menuAccent`). Se sua CLI dispara
`Invalid configuration found in components.json`, use o installer fallback:

```bash
# instala em ./src/components/openclaude-chat
node ./path/to/install.mjs

# base custom (ex: monorepo com apps/)
node ./path/to/install.mjs --target-base=apps/frontend

# preview sem escrever nada
node ./path/to/install.mjs --dry-run

# nao imprime a lista de deps no final
node ./path/to/install.mjs --skip-deps
```

Depois, instala as deps npm manualmente (o script imprime o comando exato no final):

```bash
npm install react-markdown remark-gfm rehype-highlight @tanstack/react-virtual lucide-react \
  class-variance-authority clsx tailwind-merge recharts embla-carousel-react cmdk \
  @radix-ui/react-alert-dialog @radix-ui/react-collapsible @radix-ui/react-context-menu \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover \
  @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-tooltip \
  framer-motion sucrase vaul
```

## O que é instalado

Tudo sob `src/components/openclaude-chat/` (ou o `--target-base` que você passou).

Estrutura:

```
src/components/openclaude-chat/
├── index.ts                    # barrel — importe daqui
├── types.ts
├── transport.ts
├── styles.css
├── components/                 # <Chat>, <History>, <ChatHeader>, etc.
├── display/                    # 20 display renderers
├── hooks/                      # ChatProvider, HistoryProvider, useMediaQuery, etc.
├── i18n/                       # en-US, pt-BR, es-ES + custom support
├── lib/                        # utils, sdk-to-message converter
├── parts/                      # PartRenderer, ReasoningBlock, ToolActivity, etc.
└── ui/                         # shadcn primitives vendored (17 arquivos)
```

## Uso mínimo

```tsx
import {
  Chat,
  HistoryResponsive,
  ChatStarButton,
  ChatActionsResponsive,
  HistoryNewButton,
  createDefaultTransport,
} from "@/components/openclaude-chat"

const transport = createDefaultTransport("/api/v1/ai", API_KEY)

function ChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HistoryResponsive
        transport={transport}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        activeConversationId={activeId}
        onSelectConversation={setActiveId}
        onNewConversation={setActiveId}
      />
      <Chat
        endpoint="/api/v1/ai"
        sessionId={activeId ?? undefined}
        maxWidth="3xl"
      />
    </div>
  )
}
```

## Pitfalls

### API keys agent-scoped — SEMPRE propague o `agentId` em duas pontas

Se tua api-key só autoriza agentes específicos (ex: `allowed-agents: ["system.nic"]`),
o backbone retorna **HTTP 403 `{"error":"forbidden"}`** ao tentar criar conversa
sem `agentId` explícito no body (ele defaulta pra `system.main`).

Dois caminhos criam conversa dentro da lib; **ambos precisam do `agentId`**:

1. **`<Chat>` `ensureSession`** (quando montado sem `sessionId`) — use a prop
   `agentId` do próprio Chat:
   ```tsx
   <Chat endpoint="/api/v1/ai" token={API_KEY} agentId="system.nic" />
   ```

2. **`<History>` botão "Nova"** (interno ao painel de histórico, também
   disparado por `<HistoryResponsive>`) — use o `<HistoryProvider>` wrapper:
   ```tsx
   <HistoryProvider transport={transport} agentId="system.nic">
     <Chat agentId="system.nic" ... />
     <HistoryResponsive ... />
   </HistoryProvider>
   ```

O `HistoryProvider` entrega o `agentId` via context pro hook interno `useHistoryData`,
que passa no body ao criar conversas. Sem ele, o botão "Nova" dentro do painel
de histórico cria conversa com agent default → 403.

**Regra prática:** se a api-key é agent-scoped, passe `agentId` nas DUAS pontas.
Redundante? Sim. Mas cada ponta cobre um caminho de criação diferente e
omitir qualquer uma deixa buracos silenciosos.

### Mantenha overlays secundários montados mesmo em erro do Chat

Early-return de erro desmonta `<HistoryResponsive>`, `<ChatActionsResponsive>`
ou qualquer affordance injetada no breadcrumb (notificações, settings drawer,
etc.), prendendo o usuário no estado de erro sem escape pra trocar de
conversa ou acessar o menu. Renderize os containers fora do branch de erro,
ou dentro de um `<Fragment>` comum aos ramos success/loading/error.

**Anti-pattern:**

```tsx
function ChatPage() {
  if (error) return <ErrorView />  // ❌ desmontou History + Menu
  return (
    <>
      <HistoryResponsive ... />
      <ChatActionsResponsive ... />
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
      <HistoryResponsive ... />      {/* sempre montado */}
      <ChatActionsResponsive ... />  {/* sempre montado */}
      {error ? <ErrorView /> : <Chat ... />}
    </>
  )
}
```

## Atualização

Quando o registry for atualizado (novo `openclaude-chat.json`), basta rodar
de novo o comando de instalação. Os arquivos em `src/components/openclaude-chat/`
serão sobrescritos.

**Não edite os arquivos em `src/components/openclaude-chat/` — suas
modificações serão perdidas no próximo update.** Toda customização deve
acontecer via props dos componentes.

Para histórico de mudanças entre versões (especialmente breaking changes
ao migrar do npm tgz pro registry), ver [`CHANGELOG.md`](./CHANGELOG.md).

## Compatibilidade

- React 18 ou 19
- Tailwind v4 (via `@tailwindcss/vite` ou equivalente)
- Node 20+ para rodar `install.mjs`
- CSS variables do shadcn (theme padrão — `--background`, `--foreground`,
  `--primary`, `--radius`, etc.)
