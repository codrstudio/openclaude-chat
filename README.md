# @codrstudio/agentic-chat

React chat UI for AI agents powered by [@codrstudio/agentic-sdk](https://github.com/codrstudio/agentic-sdk). Streaming responses, tool visualization, rich display renderers, file attachments, and voice input.

## Install

```bash
npm install github:codrstudio/agentic-chat
```

## Quick Start

```tsx
import { Chat } from "@codrstudio/agentic-chat";
import "@codrstudio/agentic-chat/styles.css";

function App() {
  return (
    <Chat
      endpoint="/api/v1/ai"
      token={jwtToken}
      sessionId="session-123"
    />
  );
}
```

That's it. The `<Chat>` component handles message list, input, streaming, tool activity, and rich content rendering.

## Props

```typescript
interface ChatProps {
  endpoint: string;              // API base URL (e.g. "/api/v1/ai" or "")
  token: string;                 // JWT auth token
  sessionId: string;             // Session identifier
  initialMessages?: Message[];   // Pre-existing messages to display
  displayRenderers?: DisplayRendererMap;  // Custom display renderers
  placeholder?: string;          // Input placeholder text
  header?: React.ReactNode;      // Header slot
  footer?: React.ReactNode;      // Footer slot
  className?: string;            // CSS classes
  enableAttachments?: boolean;   // File upload (default: true)
  enableVoice?: boolean;         // Voice recording (default: true)
}
```

## Usage with a Backend Proxy

The typical setup uses a Vite/Next.js proxy so `endpoint` can be empty or relative:

```tsx
// Vite dev: proxy /api → backend (configured in vite.config.ts)
<Chat endpoint="" token={token} sessionId={id} />

// Direct backend connection
<Chat endpoint="http://localhost:6002/api/v1/ai" token={token} sessionId={id} />
```

## Loading Existing Messages

```tsx
<Chat
  endpoint=""
  token={token}
  sessionId={id}
  initialMessages={[
    { id: "1", role: "user", content: "Hello" },
    { id: "2", role: "assistant", content: "Hi! How can I help?" },
  ]}
/>
```

## Components

All components are exported individually for custom layouts:

| Component | Purpose |
|-----------|---------|
| `Chat` | Full chat interface (main component) |
| `ChatProvider` / `useChatContext` | Context provider for custom layouts |
| `useBackboneChat` | Hook for API integration |
| `MessageList` | Message display with virtual scrolling |
| `MessageInput` | Input with attachments, voice, drag-drop |
| `MessageBubble` | Individual message bubble |
| `Markdown` | Markdown renderer (GFM + syntax highlight) |
| `StreamingIndicator` | Animated typing indicator |
| `ErrorNote` | Error display with retry |

### Part Renderers

| Component | Purpose |
|-----------|---------|
| `PartRenderer` | Dispatches message parts (text, reasoning, tools) |
| `ReasoningBlock` | Collapsible extended thinking display |
| `ToolActivity` | Tool execution status visualization |
| `ToolResult` | Tool execution result display |

### Display Renderers (19)

Rich content renderers for agent display tools:

`AlertRenderer`, `MetricCardRenderer`, `PriceHighlightRenderer`, `FileCardRenderer`, `CodeBlockRenderer`, `SourcesListRenderer`, `StepTimelineRenderer`, `ProgressStepsRenderer`, `ChartRenderer`, `CarouselRenderer`, `ProductCardRenderer`, `ComparisonTableRenderer`, `DataTableRenderer`, `SpreadsheetRenderer`, `GalleryRenderer`, `ImageViewerRenderer`, `LinkPreviewRenderer`, `MapViewRenderer`, `ChoiceButtonsRenderer`

#### Custom Renderers

```tsx
import { Chat } from "@codrstudio/agentic-chat";

<Chat
  endpoint=""
  token={token}
  sessionId={id}
  displayRenderers={{
    chart: MyCustomChartRenderer,
    table: MyCustomTableRenderer,
  }}
/>
```

## Custom Layout

For full control over the chat UI:

```tsx
import {
  ChatProvider,
  useChatContext,
  MessageList,
  MessageInput,
} from "@codrstudio/agentic-chat";
import "@codrstudio/agentic-chat/styles.css";

function CustomChat() {
  const ctx = useChatContext();
  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={ctx.messages}
        isLoading={ctx.isLoading}
      />
      <MessageInput
        input={ctx.input}
        setInput={ctx.setInput}
        handleSubmit={ctx.handleSubmit}
        isLoading={ctx.isLoading}
        stop={ctx.stop}
      />
    </div>
  );
}

function App() {
  return (
    <ChatProvider endpoint="/api" token={token} sessionId="s1">
      <CustomChat />
    </ChatProvider>
  );
}
```

## Features

- **Virtual scrolling** — performant message list via `@tanstack/react-virtual`
- **Auto-scroll** — follows new messages, pauses when user scrolls up
- **File attachments** — drag-drop and file picker, multipart upload
- **Voice recording** — MediaRecorder API for audio messages
- **Markdown** — full GFM support with syntax highlighting
- **Tool visualization** — collapsible tool calls with status and results
- **Extended thinking** — collapsible reasoning blocks
- **Rich displays** — 19 specialized renderers for charts, tables, products, etc.
- **Error handling** — timeout detection (30s), retry support
- **Responsive** — mobile-friendly with touch support

## Peer Dependencies

- `react` ^18 or ^19
- `react-dom` ^18 or ^19

## Styles

The package exports a compiled CSS file. Import it once at your app entry:

```typescript
import "@codrstudio/agentic-chat/styles.css";
```

## License

MIT
