import type { DisplaySpreadsheet } from "./sdk-types.js";
import { ScrollArea, ScrollBar } from "../ui/scroll-area.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table.js";
import { cn } from "../lib/utils.js";
import { useTranslation } from "../i18n/index.js";

function formatCell(
  value: string | number | null,
  colIndex: number,
  locale: string,
  moneyColumns: number[] = [],
  percentColumns: number[] = [],
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (moneyColumns.includes(colIndex)) {
      return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(value);
    }
    if (percentColumns.includes(colIndex)) {
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(value / 100);
    }
    return new Intl.NumberFormat(locale).format(value);
  }
  return String(value);
}

export function SpreadsheetRenderer({ title, headers, rows, format }: DisplaySpreadsheet) {
  const { t, locale } = useTranslation();
  const moneyColumns = format?.moneyColumns ?? [];
  const percentColumns = format?.percentColumns ?? [];

  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}

      <ScrollArea className="w-full">
        <Table aria-readonly="true">
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground font-normal text-center w-10" aria-label={t("spreadsheet.row")} />
              {headers.map((h, i) => (
                <TableHead key={i} className="font-semibold">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, ri) => (
              <TableRow key={ri}>
                <TableCell className="text-center text-xs text-muted-foreground select-none">
                  {ri + 1}
                </TableCell>
                {row.map((cell, ci) => {
                  const isMoney = moneyColumns.includes(ci);
                  const isPercent = percentColumns.includes(ci);
                  const isNumber = typeof cell === "number";
                  return (
                    <TableCell
                      key={ci}
                      className={cn(
                        (isMoney || isPercent || isNumber) && "text-right font-mono text-sm"
                      )}
                    >
                      {formatCell(cell, ci, locale, moneyColumns, percentColumns)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
