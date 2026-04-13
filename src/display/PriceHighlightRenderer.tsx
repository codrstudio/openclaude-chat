import type { DisplayPrice } from "./sdk-types.js";
import { ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { useTranslation } from "../i18n/index.js";

export function PriceHighlightRenderer({ value, label, context, source, badge }: DisplayPrice) {
  const { locale } = useTranslation();

  function formatPrice(v: number, currency?: string): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "BRL",
      }).format(v);
    } catch {
      return new Intl.NumberFormat(locale).format(v);
    }
  }
  // Tambem aceita value como numero flat (modelo pode nao seguir schema exato).
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "object" && value !== null && "value" in value
        ? (value as { value: number }).value
        : 0;
  const currency =
    typeof value === "object" && value !== null && "currency" in value
      ? (value as { currency?: string }).currency
      : undefined;
  return (
    <Card className="p-4 space-y-1 w-fit">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          {formatPrice(amount, currency)}
        </span>
        {badge && (
          <Badge variant="destructive">
            {badge.label}
          </Badge>
        )}
      </div>
      {context && <p className="text-sm text-muted-foreground">{context}</p>}
      {source && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          {source.favicon && (
            <img src={source.favicon} alt="" width={14} height={14} aria-hidden="true" />
          )}
          <span>{source.name}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </Card>
  );
}
