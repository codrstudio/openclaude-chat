# Changelog

All notable changes to `@codrstudio/openclaude-chat` are documented here.
This file tracks diffs relevant to **consumers migrating between versions**,
especially from the npm tgz delivery to the shadcn registry delivery.

## 0.5.2 — 2026-04-18

### Fixed

- **History carregava com todas as mensagens aparecendo como "(resposta vazia)".**
  `transport.getMessages()` retornava o payload cru do backbone (SDK-format:
  `{type, message: {content}}`) em vez de converter pro `Message` format da
  lib (com `parts`, `role`). O helper `convertSDKMessages()` já existia em
  `src/lib/sdk-to-message.ts` mas não era chamado. Afeta qualquer consumer
  que monta conversa via `transport.getMessages(id)` — o loader do
  TanStack Router, o seletor de conversa antiga no `<History>`, ou fetch
  manual. Corrigido em `src/transport.ts:105`.
- **Code blocks markdown renderizavam com estilo inline** (fundo reduzido,
  padding errado) apesar do `<pre>` wrapper correto. Causa: `rehype-highlight`
  prefixa `"hljs "` ao `className` original (`"hljs language-python"`), e
  o detector de block em `Markdown.tsx` usava `startsWith("language-")` que
  falhava nesse caso. Corrigido para `includes("language-")` em
  `src/components/Markdown.tsx:47`. Syntax highlighting não é afetado
  (continua via classes `hljs-*` nos filhos).
- **Nova prop `onRenameConversation?: (id, newTitle) => void` em `<History>`.**
  Disparada após rename via o menu de contexto do History panel. Útil pra
  consumers que derivam URLs de `title` (canonical slugs) e precisam
  rewritar a rota quando o usuário renomeia a conversa ativa. Não fire
  quando rename vem via `<ChatHeader>` / `<ChatActionsMenu>` — esses já
  têm `onRename` próprio.

### Test coverage

20/20 testes end-to-end passando (5 lado backend + 15 lado UI) via
Playwright + backbone real + api-key scoped a `system.nic`:
- Restauração de histórico: H1-H7, H9, H10
- Conversa no chat: C1-C11 (minus N/A cases)

## 0.5.1 — 2026-04-18

### Fixed

- **HTTP 403 `forbidden` em api-keys agent-scoped quando `<Chat>` criava
  sessão sem `sessionId` inicial.** `useOpenClaudeChat.ensureSession` fazia
  `POST /conversations` sem `agentId` no body, o backbone defaultava pra
  `system.main`, e keys que só autorizavam agentes específicos eram negadas.
  Nova prop `agentId?: string` em `<Chat>` e em `UseOpenClaudeChatOptions`.
- **Documentação de pitfall**: adicionado no README — para api-keys
  agent-scoped, o `agentId` precisa ser passado nas DUAS pontas:
  `<Chat agentId=...>` (cobre ensureSession) e `<HistoryProvider agentId=...>`
  (cobre o botão "Nova" interno ao `<History>`).

## 0.5.0 — 2026-04-18

First release of the registry distribution. Shadcn-style source copy under
`src/components/openclaude-chat/` in the consumer's repo, instead of the
opaque npm tgz.

### Added

**Atomic subparts** (for consumers composing into their own shell chrome):

- `<ChatTitle>` — title with inline-rename. Exposes `ref.startRename()` /
  `ref.cancelRename()` imperative handle. Optional `clickToRename` prop.
- `<ChatStarButton>` — star-toggle button. Optional `withTooltip` (default
  `true`) so consumers with custom hover affordances can disable the
  wrapping Tooltip.
- `<ChatActionsMenu>` — desktop DropdownMenu with Rename + Favorite.
- `<HistoryNewButton>` — standalone "new conversation" button for
  placement in breadcrumb, toolbar, or inside a History panel.

**Envelope containers** (for consumers who want a ready layout):

- `<HistorySidebar>` — classic 280px + border look, opt-in.
- `<HistoryDrawer>` — Vaul bottom-drawer. Controlled (`open`, `onOpenChange`),
  no embedded trigger. Mobile-optimal.
- `<HistorySheet>` — Radix-Dialog slide-in sheet. Controlled. Default
  `side="right"`, `width="440px"`. Desktop-optimal.
- `<HistoryResponsive>` — viewport-responsive switch: Drawer on mobile,
  Sheet on desktop. Default breakpoint `(min-width: 1024px)`, overridable
  via `breakpoint` prop.
- `<ChatActionsResponsive>` — symmetric to `<HistoryResponsive>`:
  DropdownMenu on desktop, Drawer-with-tappable-items on mobile. Also
  supports controlled mode (passing `open` + `onOpenChange` disables the
  embedded trigger).

**Infrastructure:**

- Hook `useMediaQuery(query)` exported — generic SSR-safe media-query hook.
- `src/ui/drawer.tsx` vendored from shadcn/ui (Vaul-based).
- `src/ui/sheet.tsx` vendored from shadcn/ui (Radix-Dialog-based).
- New npm dep: `vaul@^1.1.2`.

**Tooling:**

- `registry/install.mjs` — fallback installer. Use when the official
  `npx shadcn add` rejects your extended `components.json`. Supports
  `--target-base`, `--dry-run`, `--skip-deps`, `--force`.
- `registry/README.md` — 2 install paths (official CLI or fallback).
- `registry/CHANGELOG.md` — this file.

### Breaking changes

1. **`<Chat>`: `header` prop removed.**
   The `header?: ReactNode` slot was vestigial — the demo never used it,
   and consumers who want a header above `<Chat>` already render
   `<ChatHeader>` (or the new subparts) as a sibling. If you were passing
   `header={<X />}` to `<Chat>`, move `<X />` out as a sibling.

2. **`<History>`: outer wrapper lost `w-[280px] border-r bg-background`.**
   Previously hard-coded; now `<History>` is pure content (`flex h-full
   flex-col`). Consumers relying on the old sidebar look must now either:

   - Use the new `<HistorySidebar>` container (drop-in, same visual).
   - Wrap `<History>` in their own layout div.

   This change unblocks use inside overlays (Drawer/Sheet) that bring
   their own width and background.

### Unchanged

No changes to public API surface of these items — safe across upgrade:

- `<Chat>` (other than `header` prop removal)
- `<MessageBubble>`, `<MessageInput>`, `<MessageList>`, `<Markdown>`,
  `<StreamingIndicator>`, `<ErrorNote>`, `<ModelSelect>`, `<LocaleSelect>`
- `<ChatHeader>` compound — back-compat, now internally composes the new
  subparts
- All 20 display renderers (AlertRenderer, MetricCardRenderer,
  PriceHighlightRenderer, FileCardRenderer, CodeBlockRenderer,
  SourcesListRenderer, StepTimelineRenderer, ProgressStepsRenderer,
  ChartRenderer, CarouselRenderer, ProductCardRenderer,
  ComparisonTableRenderer, DataTableRenderer, SpreadsheetRenderer,
  GalleryRenderer, ImageViewerRenderer, LinkPreviewRenderer,
  MapViewRenderer, ChoiceButtonsRenderer)
- Parts: `<PartRenderer>`, `<ReasoningBlock>`, `<ToolActivity>`,
  `<ToolResult>`, `<TaskCard>`
- Hooks: `useOpenClaudeChat`, `useChatContext`, `useModels`,
  `useHistoryContext`, `useIsMobile`
- Types: `Message`, `MessagePart`, `TextPart`, `ReasoningPart`,
  `ToolInvocationPart`, `Conversation`, `ConversationGroup`
- i18n: `LocaleProvider`, `useTranslation`, `builtInLocales`
- Transport: `createDefaultTransport`, `createLocalStorageTransport`,
  `ChatTransport`

## Migration guide: tgz → registry

If you were using the npm package `@codrstudio/openclaude-chat` and are
moving to the registry:

### 1. Install

```bash
npx shadcn@latest add ./path/to/openclaude-chat.json --overwrite --yes
# or, if your components.json is extended (custom style/icon library):
node ./path/to/install.mjs --target-base=./
```

### 2. Update imports

```diff
- import { Chat, History, ChatHeader } from "@codrstudio/openclaude-chat"
+ import { Chat, History, ChatHeader } from "@/components/openclaude-chat"
```

### 3. Handle breaking changes

```diff
  // If you used the vestigial `header` prop:
- <Chat header={<MyHeader />} />
+ <>
+   <MyHeader />
+   <Chat />
+ </>

  // If you relied on History's old sidebar look:
- <History ... />
+ <HistorySidebar>
+   <History ... />
+ </HistorySidebar>
  // OR, if you want the new responsive overlay:
+ <HistoryResponsive open={...} onOpenChange={...} ... />
```

### 4. Remove old dep

```bash
npm uninstall @codrstudio/openclaude-chat
```

### 5. Coexistence (optional, staged migration)

The registry-installed files live at `@/components/openclaude-chat` — a
different namespace from the tgz's `@codrstudio/openclaude-chat`. Both can
coexist during migration. Typical pattern: new pages/routes consume the
registry version, legacy pages stay on tgz until ready to migrate.
