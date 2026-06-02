import type { TranslationKeys } from "../types.js";

export const ptBR: TranslationKeys = {
  // MessageInput
  "input.placeholder": "Caixa de mensagem...",
  "input.send": "Enviar mensagem",
  "input.stop": "Parar",
  "input.stopGeneration": "Parar geração",
  "input.record": "Gravar audio",
  "input.cancel": "Cancelar",
  "input.add": "Adicionar",
  "input.remove": "Remover",
  "input.dropHere": "Solte aqui",
  "input.uploading": "Enviando arquivos...",
  "input.file": "Arquivo",
  "input.camera": "Camera",
  "input.gallery": "Galeria",
  "input.message": "Mensagem",

  // MessageBubble
  "bubble.copy": "Copiar mensagem",
  "bubble.copied": "Copiado",
  "bubble.emptyResponse": "(resposta vazia)",

  // ErrorNote
  "error.default": "Falha ao processar mensagem",
  "error.retry": "Tentar novamente",

  // StreamingIndicator
  "streaming.generating": "Gerando resposta...",

  // ToolActivity
  "tool.running": "Executando...",
  "tool.done": "Concluido",

  // PartRenderer
  "part.collapse": "Recolher",
  "part.expand": "Expandir",
  "part.compactBoundary": "Conversa compactada",

  // Artifacts
  "artifact.error.title": "Não foi possível renderizar este artefato.",
  "artifact.error.transpile": "Erro ao compilar",
  "artifact.error.runtime": "Erro em tempo de execução",
  "artifact.error.blocked": "Construção bloqueada",
  "artifact.action.copy": "Copiar",
  "artifact.action.copied": "Copiado!",
  "artifact.action.download": "Baixar",
  "artifact.action.openSource": "Ver código",
  "artifact.action.openPreview": "Ver renderizado",
  "artifact.action.openInNewTab": "Abrir em nova aba",
  "artifact.loading": "Carregando…",
  "artifact.unsupported": "Tipo de artefato não suportado",

  // AskUserQuestion
  "askUser.title": "Aguardando sua resposta",
  "askUser.submit": "Responder",
  "askUser.submitting": "Enviando…",
  "askUser.cancel": "Cancelar",
  "askUser.cancelled": "Cancelado",
  "askUser.resolved": "Respondido",
  "askUser.errorSubmit": "Falha ao enviar resposta",
  "askUser.multiSelectHint": "Múltipla escolha",
  "askUser.progress": "{current} de {total}",

  // PartErrorBoundary
  "partError.default": "Falha ao renderizar bloco",

  // History
  "history.title": "Histórico",
  "history.loading": "Carregando...",
  "history.noResults": "Nenhuma conversa encontrada.",
  "history.empty": "Nenhuma conversa ainda.",
  "history.search": "Buscar conversas...",
  "history.today": "Hoje",
  "history.yesterday": "Ontem",
  "history.thisWeek": "Esta semana",
  "history.thisMonth": "Este mês",
  "history.older": "Mais antigas",

  // HistoryItem
  "history.rename": "Renomear",
  "history.favorite": "Favoritar",
  "history.unfavorite": "Desfavoritar",
  "history.favorited": "Favoritado",
  "history.delete": "Excluir",
  "history.justNow": "agora",
  "history.message": "mensagem",
  "history.messages": "mensagens",

  // HistoryDeleteDialog
  "history.deleteTitle": "Excluir conversa?",
  "history.deleteDescription": "será excluída permanentemente. Esta ação não pode ser desfeita.",
  "history.deleteCancel": "Cancelar",
  "history.deleteConfirm": "Excluir",

  // CodeBlockRenderer
  "code.copy": "Copiar código",
  "code.copied": "Copiado!",
  "code.copyLabel": "Copiar",

  // CarouselRenderer
  "carousel.previous": "Anterior",
  "carousel.next": "Próximo",
  "carousel.slides": "Slides",

  // ChoiceButtonsRenderer
  "choice.default": "Escolha uma opção",

  // ImageViewerRenderer
  "image.zoomIn": "Aumentar zoom",
  "image.zoomOut": "Reduzir zoom",
  "image.resetZoom": "Resetar zoom",
  "image.close": "Fechar",
  "image.viewer": "Visualizador de imagem",
  "image.enlarge": "Ampliar imagem",

  // GalleryRenderer
  "gallery.imageN": "Imagem",

  // MapViewRenderer
  "map.title": "Mapa OpenStreetMap",
  "map.locations": "Locais no mapa",

  // ComparisonTableRenderer
  "comparison.markBest": "Marcar como melhor",

  // FileCardRenderer
  "file.download": "Baixar",

  // SpreadsheetRenderer
  "spreadsheet.row": "Linha",

  // ProductCardRenderer
  "product.rating": "de 5 estrelas",
  "product.reviews": "avaliações",
  "product.viewProduct": "Ver produto",

  // ComparisonTableRenderer (extra)
  "comparison.attribute": "Atributo",
  "comparison.rating": "Avaliação",
  "comparison.description": "Descrição",

  // TurnFooter (MessageBubble)
  "bubble.tokenIn": "entrada",
  "bubble.tokenOut": "saída",
  "bubble.tokenCached": "cache",

  // History (search results group)
  "history.results": "Resultados",
  "history.newConversation": "Nova conversa",

  // NoSessionState
  "chat.selectConversation": "Selecione uma conversa",
  "chat.orCreateNew": "ou crie uma nova pelo painel lateral",

  // DefaultWelcome (empty chat)
  "chat.welcomeTitle": "Como posso ajudar?",
  "chat.welcomeDescription": "Envie uma mensagem para começar a conversa. Você pode pedir respostas, acionar ferramentas ou colar conteúdo para análise.",

  // MessageList
  "chat.loadingOlder": "Carregando mensagens anteriores...",
  "chat.conversationStart": "Início da conversa",

  // AnthropicAuthConfig
  "auth.title": "Conta Anthropic",
  "auth.description": "Conecte sua conta Anthropic para usar inferência do plano Max ou Pro.",
  "auth.connect": "Conectar conta Anthropic",
  "auth.disconnect": "Desconectar",
  "auth.disconnecting": "Desconectando...",
  "auth.connected": "Conectado",
  "auth.expired": "Sessão expirada — reconecte para continuar",
  "auth.loginTitle": "Conectar conta Anthropic",
  "auth.loginOpenButton": "Abrir página de autorização",
  "auth.loginOpenHint": "Uma nova aba será aberta. Após autorizar, copie o código exibido e cole abaixo.",
  "auth.loginCodeLabel": "Código de autorização",
  "auth.loginCodePlaceholder": "Cole o código aqui (formato: code#state)",
  "auth.loginCodeHint": "Copie o código completo exibido na página da Anthropic e cole acima.",
  "auth.loginConfirm": "Concluir",
  "auth.loginConfirming": "Verificando...",
  "auth.loginCancel": "Cancelar",
  "auth.loginErrorInvalid": "Código inválido ou expirado. Tente iniciar o login novamente.",
  "auth.connectProvider": "Conectar",
  "auth.changeProvider": "Configurar provedor",
  "auth.providerPickerTitle": "Escolha um provedor",
  "auth.oauthModeLabel": "Tipo de conta",
  "auth.emailHint": "Email (opcional)",
  "auth.getKey": "Obter API key",
  "auth.save": "Salvar",
  "auth.saving": "Salvando...",
  "auth.saveError": "Não foi possível salvar o provedor. Verifique os campos.",
  "auth.back": "Voltar",
  "auth.detectModels": "Detectar modelos",
  "auth.ollamaNoModels": "Nenhum modelo instalado no Ollama.",
  "auth.ollamaUnreachable": "Ollama inalcançável",
} as const;
