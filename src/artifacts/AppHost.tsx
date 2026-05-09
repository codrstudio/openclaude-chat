// ===========================================================================
// AppHost.tsx — Executa o source de um artifact React e renderiza o resultado.
//
// Pipeline:
//   source -> compile() -> new Function(scope, code) -> App component
//   -> React.createElement(App) -> dentro de ErrorBoundary
//
// Princípio: chat NUNCA pode dar pau. Qualquer erro de compile, runtime
// ou render é capturado e renderizado como fallback inline.
// ===========================================================================

import * as React from "react"
import { compile, CompileError } from "./compile.js"
import { buildScope, type AppActions } from "./runtime.js"

export interface AppHostProps {
  /** Source TSX single-file. Espera um `function App() {...}`. */
  source: string
  actions: AppActions
  messages?: Partial<{
    errorTitle: string
    errorTranspile: string
    errorRuntime: string
    errorBlocked: string
  }>
}

interface CompileFailure {
  stage: "transpile" | "validate" | "execute" | "no-component"
  message: string
  detail?: string
}

interface CompiledOk {
  Component: React.ComponentType
}

function compileSource(
  source: string,
  scope: Record<string, unknown>,
): CompiledOk | CompileFailure {
  let compiled: { code: string }
  try {
    compiled = compile(source, "App.tsx")
  } catch (err) {
    if (err instanceof CompileError) {
      return {
        stage: err.stage,
        message: err.message,
        detail: err.violations?.join(", "),
      }
    }
    return {
      stage: "transpile",
      message: err instanceof Error ? err.message : String(err),
    }
  }

  const wrapped = `${compiled.code}\n;return (typeof App !== 'undefined' ? App : null);`

  let Component: unknown
  try {
    const scopeKeys = Object.keys(scope)
    const scopeVals = scopeKeys.map((k) => scope[k])
    const factory = new Function(...scopeKeys, wrapped)
    Component = factory(...scopeVals)
  } catch (err) {
    return {
      stage: "execute",
      message: err instanceof Error ? err.message : String(err),
    }
  }

  if (typeof Component !== "function") {
    return {
      stage: "no-component",
      message: `Source did not define an "App" function`,
    }
  }

  return { Component: Component as React.ComponentType }
}

class RuntimeErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (err: Error) => void },
  { err: Error | null }
> {
  override state: { err: Error | null } = { err: null }
  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  override componentDidCatch(err: Error) {
    this.props.onError(err)
  }
  override render() {
    if (this.state.err) return null
    return this.props.children
  }
}

export function AppHost({ source, actions, messages }: AppHostProps) {
  const scope = React.useMemo(() => buildScope({ actions }), [actions])
  const compiled = React.useMemo(() => compileSource(source, scope), [source, scope])
  const [runtimeError, setRuntimeError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    setRuntimeError(null)
  }, [source])

  if ("stage" in compiled) {
    return <Fallback failure={compiled} messages={messages} />
  }

  if (runtimeError) {
    return (
      <Fallback
        failure={{ stage: "execute", message: runtimeError.message }}
        messages={messages}
      />
    )
  }

  const Component = compiled.Component
  return (
    <RuntimeErrorBoundary onError={setRuntimeError}>
      <Component />
    </RuntimeErrorBoundary>
  )
}

function Fallback({
  failure,
  messages,
}: {
  failure: CompileFailure
  messages?: AppHostProps["messages"]
}) {
  const m = messages ?? {}
  const title = m.errorTitle ?? "Não foi possível renderizar este bloco."
  const label =
    failure.stage === "validate"
      ? m.errorBlocked ?? "Construção bloqueada"
      : failure.stage === "execute"
        ? m.errorRuntime ?? "Erro em tempo de execução"
        : m.errorTranspile ?? "Erro ao compilar"
  return (
    <div className="border border-destructive/30 bg-destructive/5 text-destructive-foreground rounded-md p-3 text-sm">
      <div className="font-medium">{title}</div>
      <div className="text-xs opacity-80 mt-1">
        {label}: {failure.message}
        {failure.detail ? <> ({failure.detail})</> : null}
      </div>
    </div>
  )
}
