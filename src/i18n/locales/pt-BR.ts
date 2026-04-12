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
} as const;
