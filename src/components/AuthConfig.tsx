import * as React from "react";
import { useMemo, useState } from "react";
import { PROVIDER_CATALOG } from "@codrstudio/hammer-sdk/catalog";
import type { CatalogEntry, CatalogField } from "@codrstudio/hammer-sdk/catalog";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useTranslation } from "../i18n/index.js";
import { cn } from "../lib/utils.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.js";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer.js";
import { Input } from "../ui/input.js";

export type OAuthMode = "claudeai" | "console" | "sso";

/** Estado de auth consolidado: conta Anthropic (OAuth) OU provider via profile. */
export interface AuthConfigStatus {
  /** Anthropic OAuth conectado. */
  loggedIn: boolean;
  subscriptionType?: string | null;
  expired?: boolean;
  /** Profile de provider ativo (id do profile, ex.: "openai"). */
  provider?: string | null;
  /** Rótulo do método ativo (ex.: "xAI (Grok)"). */
  providerLabel?: string | null;
  model?: string | null;
  baseUrl?: string | null;
  authMode?: string | null;
}

export interface OllamaProbeResult {
  reachable: boolean;
  models: { name: string }[];
  error?: string;
}

export interface AuthConfigProps {
  status: AuthConfigStatus | null;
  /** Catálogo de métodos. Default: PROVIDER_CATALOG do SDK. */
  catalog?: CatalogEntry[];
  /** Inicia o OAuth Anthropic no modo escolhido. */
  onStartLogin: (mode: OAuthMode, email?: string) => Promise<{ authorizeUrl: string; loginId: string }>;
  /** Completa o OAuth com o contracódigo colado. */
  onCompleteLogin: (loginId: string, code: string) => Promise<AuthConfigStatus>;
  /** Salva um provider via credencial (não-OAuth). */
  onSaveProvider: (id: string, fields: Record<string, string>) => Promise<AuthConfigStatus>;
  /** Lista modelos do Ollama local (opcional). */
  onProbeOllama?: (baseUrl?: string) => Promise<OllamaProbeResult>;
  /** Desconecta o método ativo. */
  onLogout: () => Promise<void>;
  onRefreshStatus?: () => Promise<AuthConfigStatus>;
  className?: string;
  title?: string;
  description?: string;
}

function planLabel(subscriptionType: string | null | undefined): string {
  if (!subscriptionType) return "";
  const s = subscriptionType.toLowerCase();
  if (s.includes("max")) return "Max";
  if (s.includes("pro")) return "Pro";
  return subscriptionType;
}

function isFieldVisible(field: CatalogField, values: Record<string, string>): boolean {
  if (!field.showIf) return true;
  return (values[field.showIf.field] ?? "") === field.showIf.equals;
}

function initialValues(entry: CatalogEntry): Record<string, string> {
  const v: Record<string, string> = {};
  for (const f of entry.fields) v[f.key] = f.default ?? "";
  return v;
}

// ---------------------------------------------------------------------------
// Formulário de provider via credencial
// ---------------------------------------------------------------------------

interface ProviderFormProps {
  entry: CatalogEntry;
  onBack: () => void;
  onSaveProvider: AuthConfigProps["onSaveProvider"];
  onProbeOllama?: AuthConfigProps["onProbeOllama"];
  onDone: () => void;
}

function ProviderForm({ entry, onBack, onSaveProvider, onProbeOllama, onDone }: ProviderFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(entry));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[] | null>(null);
  const [ollamaNote, setOllamaNote] = useState<string | null>(null);

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleProbe() {
    if (!onProbeOllama) return;
    setProbing(true);
    setOllamaNote(null);
    try {
      const res = await onProbeOllama(values.baseUrl);
      if (res.reachable) {
        const names = res.models.map((m) => m.name);
        setOllamaModels(names);
        setOllamaNote(names.length ? null : t("auth.ollamaNoModels"));
        if (names.length && !names.includes(values.model)) setField("model", names[0]);
      } else {
        setOllamaModels(null);
        setOllamaNote(`${t("auth.ollamaUnreachable")}${res.error ? ` (${res.error})` : ""}`);
      }
    } finally {
      setProbing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      for (const f of entry.fields) {
        if (isFieldVisible(f, values)) payload[f.key] = (values[f.key] ?? "").trim();
      }
      await onSaveProvider(entry.id, payload);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const visibleFields = entry.fields.filter((f) => isFieldVisible(f, values));

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          {t("auth.back")}
        </Button>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{entry.label}</p>
        {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
      </div>

      {visibleFields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium leading-none" htmlFor={`field-${field.key}`}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </label>
          {field.type === "select" ? (
            <select
              id={`field-${field.key}`}
              value={values[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`field-${field.key}`}
              type={field.type === "password" ? "password" : "text"}
              value={values[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
              placeholder={field.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
          )}
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          {field.key === "model" && entry.id === "ollama" && ollamaModels && ollamaModels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ollamaModels.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setField("model", name)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs transition-colors",
                    values.model === name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {entry.id === "ollama" && onProbeOllama && (
        <Button variant="outline" size="sm" onClick={handleProbe} disabled={probing} className="w-full sm:w-auto">
          {probing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {t("auth.detectModels")}
        </Button>
      )}
      {ollamaNote && <p className="text-xs text-muted-foreground">{ollamaNote}</p>}

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {entry.docsUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(entry.docsUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-4" />
            {t("auth.getKey")}
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {saving ? t("auth.saving") : t("auth.save")}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fluxo OAuth Anthropic (claude.ai / Console / SSO)
// ---------------------------------------------------------------------------

interface AnthropicFormProps {
  entry: CatalogEntry;
  onBack: () => void;
  onStartLogin: AuthConfigProps["onStartLogin"];
  onCompleteLogin: AuthConfigProps["onCompleteLogin"];
  onDone: () => void;
}

function AnthropicForm({ entry, onBack, onStartLogin, onCompleteLogin, onDone }: AnthropicFormProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<OAuthMode>(entry.oauthModes?.[0]?.value ?? "claudeai");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"init" | "awaiting">("init");
  const [authorizeUrl, setAuthorizeUrl] = useState("");
  const [loginId, setLoginId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setBusy(true);
    setError(null);
    try {
      const { authorizeUrl: url, loginId: id } = await onStartLogin(mode, email.trim() || undefined);
      setAuthorizeUrl(url);
      setLoginId(id);
      window.open(url, "_blank", "noopener,noreferrer");
      setPhase("awaiting");
    } catch {
      setError(t("auth.loginErrorInvalid"));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onCompleteLogin(loginId, trimmed);
      onDone();
    } catch {
      setError(t("auth.loginErrorInvalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          {t("auth.back")}
        </Button>
      </div>

      {phase === "init" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium leading-none" htmlFor="oauth-mode">
              {t("auth.oauthModeLabel")}
            </label>
            <select
              id="oauth-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as OAuthMode)}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              {(entry.oauthModes ?? []).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {entry.oauthModes?.find((m) => m.value === mode)?.description && (
              <p className="text-xs text-muted-foreground">
                {entry.oauthModes.find((m) => m.value === mode)?.description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium leading-none" htmlFor="oauth-email">
              {t("auth.emailHint")}
            </label>
            <Input
              id="oauth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
            />
          </div>

          <p className="text-sm text-muted-foreground">{t("auth.loginOpenHint")}</p>
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </p>
          )}
          <Button onClick={handleOpen} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            {t("auth.loginOpenButton")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("auth.loginOpenHint")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(authorizeUrl, "_blank", "noopener,noreferrer")}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="size-4" />
            {t("auth.loginOpenButton")}
          </Button>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium leading-none" htmlFor="auth-code-input">
              {t("auth.loginCodeLabel")}
            </label>
            <Input
              id="auth-code-input"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) handleComplete();
              }}
              placeholder={t("auth.loginCodePlaceholder")}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">{t("auth.loginCodeHint")}</p>
          </div>
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={handleComplete} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {busy ? t("auth.loginConfirming") : t("auth.loginConfirm")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Picker (grade de métodos)
// ---------------------------------------------------------------------------

function ProviderPicker({
  catalog,
  onPick,
}: {
  catalog: CatalogEntry[];
  onPick: (entry: CatalogEntry) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
      {catalog.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onPick(entry)}
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border border-input p-3 text-left transition-colors",
            "hover:border-primary hover:bg-muted",
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {entry.kind === "oauth" ? <LogIn className="size-3.5" /> : <KeyRound className="size-3.5" />}
            {entry.label}
          </span>
          {entry.description && (
            <span className="line-clamp-2 text-xs text-muted-foreground">{entry.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function AuthConfig({
  status,
  catalog: catalogProp,
  onStartLogin,
  onCompleteLogin,
  onSaveProvider,
  onProbeOllama,
  onLogout,
  onRefreshStatus: _onRefreshStatus,
  className,
  title,
  description,
}: AuthConfigProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const catalog = catalogProp ?? PROVIDER_CATALOG;

  const isAnthropicConnected = status?.loggedIn === true;
  const isProviderConnected = !isAnthropicConnected && !!status?.provider;
  const isConnected = isAnthropicConnected || isProviderConnected;
  const isExpired = status?.expired === true;
  const plan = planLabel(status?.subscriptionType);

  const activeLabel = useMemo(() => {
    if (isAnthropicConnected) return `Anthropic${plan ? ` · ${plan}` : ""}`;
    if (isProviderConnected) {
      const label = status?.providerLabel ?? status?.provider ?? "";
      return status?.model ? `${label} · ${status.model}` : label;
    }
    return "";
  }, [isAnthropicConnected, isProviderConnected, plan, status]);

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      await onLogout();
    } finally {
      setIsDisconnecting(false);
    }
  }

  function openPicker() {
    setSelected(null);
    setOpen(true);
  }

  function handleDone() {
    setOpen(false);
    setSelected(null);
  }

  const panel = selected ? (
    selected.kind === "oauth" ? (
      <AnthropicForm
        entry={selected}
        onBack={() => setSelected(null)}
        onStartLogin={onStartLogin}
        onCompleteLogin={onCompleteLogin}
        onDone={handleDone}
      />
    ) : (
      <ProviderForm
        entry={selected}
        onBack={() => setSelected(null)}
        onSaveProvider={onSaveProvider}
        onProbeOllama={onProbeOllama}
        onDone={handleDone}
      />
    )
  ) : (
    <ProviderPicker catalog={catalog} onPick={setSelected} />
  );

  const panelTitle = selected ? selected.label : t("auth.providerPickerTitle");

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{title ?? t("auth.title")}</CardTitle>
            {isConnected && (
              <Badge variant={isExpired ? "destructive" : "secondary"} className="shrink-0">
                {isExpired ? t("auth.expired") : `${t("auth.connected")} · ${activeLabel}`}
              </Badge>
            )}
          </div>
          {!isConnected && <CardDescription>{description ?? t("auth.description")}</CardDescription>}
          {isConnected && isExpired && (
            <CardDescription className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" />
              {t("auth.expired")}
            </CardDescription>
          )}
        </CardHeader>

        {isConnected && !isExpired && (
          <CardContent className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              <span>{activeLabel}</span>
            </div>
            {isProviderConnected && status?.baseUrl && (
              <p className="mt-1 text-xs text-muted-foreground">{status.baseUrl}</p>
            )}
          </CardContent>
        )}

        <CardFooter className="flex gap-2 pt-0">
          <Button size="sm" onClick={openPicker} aria-label={t("auth.changeProvider")}>
            <LogIn className="size-4" />
            {isConnected ? t("auth.changeProvider") : t("auth.connectProvider")}
          </Button>
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              aria-label={t("auth.disconnect")}
            >
              {isDisconnecting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              {isDisconnecting ? t("auth.disconnecting") : t("auth.disconnect")}
            </Button>
          )}
        </CardFooter>
      </Card>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{panelTitle}</DrawerTitle>
              <DrawerDescription className="sr-only">{t("auth.providerPickerTitle")}</DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[70vh] overflow-y-auto">{panel}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{panelTitle}</DialogTitle>
              <DialogDescription className="sr-only">{t("auth.providerPickerTitle")}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">{panel}</div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
