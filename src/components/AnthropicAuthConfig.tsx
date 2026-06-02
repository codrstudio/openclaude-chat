// ---------------------------------------------------------------------------
// AnthropicAuthConfig — wrapper de back-compat sobre <AuthConfig>.
//
// O componente multi-provider mora em ./AuthConfig.tsx. Este arquivo preserva
// o contrato antigo (Anthropic-only) para consumidores existentes (agent-ui):
// renderiza o AuthConfig restrito ao método Anthropic e adapta os callbacks.
// ---------------------------------------------------------------------------

import * as React from "react";
import type { AuthStatus } from "@codrstudio/hammer-sdk";
import { getCatalogEntry } from "@codrstudio/hammer-sdk/catalog";
import { AuthConfig } from "./AuthConfig.js";

export type { AuthStatus };

export interface AnthropicAuthLabels {
  title?: string;
  description?: string;
  connectButton?: string;
  disconnectButton?: string;
  disconnectingLabel?: string;
  connectedLabel?: string;
  expiredWarning?: string;
  loginTitle?: string;
  loginOpenButton?: string;
  loginOpenHint?: string;
  loginCodeLabel?: string;
  loginCodePlaceholder?: string;
  loginCodeHint?: string;
  loginConfirm?: string;
  loginConfirming?: string;
  loginCancel?: string;
  loginErrorInvalid?: string;
}

export interface AnthropicAuthConfigProps {
  status: AuthStatus | null;
  onStartLogin: () => Promise<{ authorizeUrl: string; loginId: string }>;
  onCompleteLogin: (loginId: string, code: string) => Promise<AuthStatus>;
  onLogout: () => Promise<void>;
  onRefreshStatus?: () => Promise<AuthStatus>;
  labels?: AnthropicAuthLabels;
  className?: string;
}

/** @deprecated Use `AuthConfig` (multi-provider). Mantido para back-compat. */
export function AnthropicAuthConfig({
  status,
  onStartLogin,
  onCompleteLogin,
  onLogout,
  onRefreshStatus,
  labels,
  className,
}: AnthropicAuthConfigProps) {
  const anthropic = getCatalogEntry("anthropic");
  const catalog = anthropic ? [anthropic] : [];

  return (
    <AuthConfig
      status={status as AuthStatus & { loggedIn: boolean }}
      catalog={catalog}
      className={className}
      title={labels?.title}
      description={labels?.description}
      onStartLogin={() => onStartLogin()}
      onCompleteLogin={(loginId, code) => onCompleteLogin(loginId, code)}
      onSaveProvider={async () => {
        throw new Error("AnthropicAuthConfig só suporta OAuth Anthropic.");
      }}
      onLogout={onLogout}
      onRefreshStatus={onRefreshStatus}
    />
  );
}
