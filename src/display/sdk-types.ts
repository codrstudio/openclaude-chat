// Tipos dos display widgets — espelham os schemas em
// D:\aw\context\workspaces\openclaude-sdk\repo\src\display\schemas.ts
// Mantemos local para nao ter dependencia dura em typings da SDK.

export type Money = {
  value: number;
  currency?: string;
};

export type SourceRef = {
  name: string;
  url: string;
  favicon?: string;
};

export type DisplayBadge = {
  label: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
};

// 1. METRICAS E DADOS ────────────────────────────────────────────

export type DisplayMetric = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  icon?: string;
};

export type DisplayChart = {
  type: "bar" | "line" | "pie" | "area" | "donut";
  title: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  format?: {
    prefix?: string;
    suffix?: string;
    locale?: string;
  };
};

export type DisplayTable = {
  title?: string;
  columns: Array<{
    key: string;
    label: string;
    type?: "text" | "number" | "money" | "image" | "link" | "badge";
    align?: "left" | "center" | "right";
  }>;
  rows: Array<Record<string, unknown>>;
  sortable?: boolean;
};

export type DisplayProgress = {
  title?: string;
  steps: Array<{
    label: string;
    status: "completed" | "current" | "pending";
    description?: string;
  }>;
};

// 2. PRODUTOS E COMERCIO ─────────────────────────────────────────

export type DisplayProduct = {
  title: string;
  image?: string;
  price?: Money;
  originalPrice?: Money;
  rating?: {
    score: number;
    count: number;
  };
  source?: SourceRef;
  badges?: DisplayBadge[];
  url?: string;
  description?: string;
};

export type DisplayComparison = {
  title?: string;
  items: DisplayProduct[];
  attributes?: Array<{ key: string; label: string }>;
};

export type DisplayPrice = {
  value: Money;
  label: string;
  context?: string;
  source?: SourceRef;
  badge?: DisplayBadge;
};

// 3. MIDIA ───────────────────────────────────────────────────────

export type DisplayImage = {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

export type DisplayGallery = {
  title?: string;
  images: Array<{ url: string; alt?: string; caption?: string }>;
  layout?: "grid" | "masonry";
  columns?: number;
};

export type DisplayCarousel = {
  title?: string;
  items: Array<{
    image?: string;
    title: string;
    subtitle?: string;
    price?: Money;
    url?: string;
    badges?: DisplayBadge[];
  }>;
};

// 4. REFERENCIAS E NAVEGACAO ─────────────────────────────────────

export type DisplaySources = {
  label?: string;
  sources: Array<{
    title: string;
    url: string;
    favicon?: string;
    snippet?: string;
  }>;
};

export type DisplayLink = {
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
};

export type DisplayMap = {
  title?: string;
  pins: Array<{
    lat: number;
    lng: number;
    label?: string;
    address?: string;
  }>;
  zoom?: number;
};

// 5. DOCUMENTOS E ARQUIVOS ───────────────────────────────────────

export type DisplayFile = {
  name: string;
  type: string;
  size?: number;
  url?: string;
  preview?: string;
};

export type DisplayCode = {
  language: string;
  code: string;
  title?: string;
  lineNumbers?: boolean;
};

export type DisplaySpreadsheet = {
  title?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  format?: {
    moneyColumns?: number[];
    percentColumns?: number[];
  };
};

// 6. INTERATIVO ──────────────────────────────────────────────────

export type DisplaySteps = {
  title?: string;
  steps: Array<{
    title: string;
    description?: string;
    status?: "completed" | "current" | "pending";
  }>;
  orientation?: "vertical" | "horizontal";
};

export type DisplayAlert = {
  variant: "info" | "warning" | "error" | "success";
  title?: string;
  message: string;
  icon?: string;
};

export type DisplayChoices = {
  question?: string;
  choices: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
  }>;
  layout?: "buttons" | "cards" | "list";
};
