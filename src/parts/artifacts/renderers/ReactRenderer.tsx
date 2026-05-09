// React artifact — wrapper em volta do AppHost que injeta a `actions.ask`
// vinda do ChatContext (botões dentro do app podem disparar follow-ups).
//
// IMPORTANTE: actions precisa ser estável (mesma referência entre renders),
// senão o useMemo do AppHost recompila o source a cada render do contexto
// e o componente perde state (re-mount). Usamos useRef pra capturar a
// versão mais recente do `chat.sendMessage` sem mudar a identidade de
// `actions`.

import { useMemo, useRef, useEffect } from "react";
import { AppHost } from "../../../artifacts/AppHost.js";
import { useChatContext } from "../../../hooks/ChatProvider.js";
import { useTranslation } from "../../../i18n/index.js";

export function ReactRenderer({ source }: { source: string }) {
  const { t } = useTranslation();
  const chat = useChatContext();

  const sendRef = useRef(chat.sendMessage);
  useEffect(() => {
    sendRef.current = chat.sendMessage;
  }, [chat.sendMessage]);

  // actions é montado UMA vez (deps vazias) e usa sendRef pra invocar a
  // versão atual de sendMessage sem virar referência nova a cada render.
  const actions = useMemo(
    () => ({
      ask: (text: string) => {
        void sendRef.current(text);
      },
    }),
    [],
  );

  // Mensagens i18n são plain strings — também estabilizadas.
  const messages = useMemo(
    () => ({
      errorTitle: t("artifact.error.title"),
      errorTranspile: t("artifact.error.transpile"),
      errorRuntime: t("artifact.error.runtime"),
      errorBlocked: t("artifact.error.blocked"),
    }),
    [t],
  );

  return (
    <div className="px-4 py-4">
      <AppHost source={source} actions={actions} messages={messages} />
    </div>
  );
}
