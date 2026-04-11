import type { DisplayAlert } from "./sdk-types.js";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert.js";

type AlertVariant = "info" | "warning" | "error" | "success";

const VARIANT_ICON: Record<AlertVariant, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

export function AlertRenderer({ variant = "info", title, message }: DisplayAlert) {
  const Icon = VARIANT_ICON[variant as AlertVariant] ?? Info;
  return (
    <Alert variant={variant === "error" ? "destructive" : "default"}>
      <Icon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
