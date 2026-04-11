// Tipos locais usados pelo @codrstudio/openclaude-chat.
// Nao depende de @ai-sdk/react. Modelo inspirado nos "parts" do ai-sdk,
// mas alimentado a partir de SDKMessage do @codrstudio/openclaude-sdk.

export type TextPart = { type: "text"; text: string };

export type ReasoningPart = { type: "reasoning"; reasoning: string };

export type ToolInvocationState = "call" | "partial-call" | "result";

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
    toolCallId: string;
    state: ToolInvocationState;
    args?: Record<string, unknown>;
    result?: unknown;
    isError?: boolean;
  };
};

export type ImageAttachmentPart = { type: "image"; _ref?: string; mimeType?: string };
export type FileAttachmentPart = { type: "file"; _ref?: string; mimeType?: string };

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | ImageAttachmentPart
  | FileAttachmentPart
  | { type: string };

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  parts: MessagePart[];
}
