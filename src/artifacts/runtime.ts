// ===========================================================================
// runtime.ts — Constrói o scope passado ao `new Function` em AppHost.
//
// O scope é o conjunto fechado de identificadores que o código gerado pelo
// agente pode usar. Tudo fora daqui não está acessível (defesa-em-profundidade
// junto com o validator de compile.ts).
// ===========================================================================

import * as React from "react"
import * as Recharts from "recharts"
import * as FramerMotion from "framer-motion"
import * as LucideIcons from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card.js"
import { Button } from "../ui/button.js"
import { Badge } from "../ui/badge.js"
import { Progress } from "../ui/progress.js"
import { Separator } from "../ui/separator.js"
import { Skeleton } from "../ui/skeleton.js"
import { ScrollArea } from "../ui/scroll-area.js"
import { Input } from "../ui/input.js"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip.js"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet.js"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog.js"
import { Alert, AlertTitle, AlertDescription } from "../ui/alert.js"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible.js"

export interface AppActions {
  /** Envia `text` como nova mensagem do usuário pro agente. */
  ask: (text: string) => void
}

export interface BuildScopeOptions {
  actions: AppActions
}

// ─── Shims pra componentes ainda não presentes em src/ui ────────────────────
// Estratégia: render children num <div> simples; o agente pode usar mas o
// look-and-feel cai pro padrão. Quando trazermos os shadcn reais, basta
// substituir o import.

type DivProps = React.HTMLAttributes<HTMLDivElement>
const passthrough = (name: string) =>
  function Shim(props: DivProps) {
    return React.createElement("div", { "data-shim": name, ...props })
  }

const Tabs = passthrough("Tabs")
const TabsList = passthrough("TabsList")
const TabsTrigger = passthrough("TabsTrigger")
const TabsContent = passthrough("TabsContent")
const Slider = passthrough("Slider")
const Switch = passthrough("Switch")
const Avatar = passthrough("Avatar")
const AvatarImage = passthrough("AvatarImage")
const AvatarFallback = passthrough("AvatarFallback")
const Select = passthrough("Select")
const SelectTrigger = passthrough("SelectTrigger")
const SelectValue = passthrough("SelectValue")
const SelectContent = passthrough("SelectContent")
const SelectItem = passthrough("SelectItem")
const Toggle = passthrough("Toggle")

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildScope(opts: BuildScopeOptions): Record<string, unknown> {
  const icon = (name: string) => {
    const Comp = (LucideIcons as Record<string, unknown>)[name]
    return typeof Comp === "function" ? Comp : null
  }

  return {
    // React essencial
    React,
    useState: React.useState,
    useMemo: React.useMemo,
    useCallback: React.useCallback,
    useEffect: React.useEffect,
    Fragment: React.Fragment,

    // shadcn UI
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Button,
    Badge,
    Progress,
    Separator,
    Skeleton,
    ScrollArea,
    Input,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider,
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Alert,
    AlertTitle,
    AlertDescription,
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
    // shims (ainda sem shadcn instalado)
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Slider,
    Switch,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Toggle,

    // Charts (namespace + spread por conveniência)
    Recharts,
    ResponsiveContainer: Recharts.ResponsiveContainer,
    LineChart: Recharts.LineChart,
    BarChart: Recharts.BarChart,
    PieChart: Recharts.PieChart,
    AreaChart: Recharts.AreaChart,
    RadarChart: Recharts.RadarChart,
    XAxis: Recharts.XAxis,
    YAxis: Recharts.YAxis,
    Legend: Recharts.Legend,
    CartesianGrid: Recharts.CartesianGrid,
    Line: Recharts.Line,
    Bar: Recharts.Bar,
    Pie: Recharts.Pie,
    Area: Recharts.Area,
    Radar: Recharts.Radar,
    Cell: Recharts.Cell,

    // Motion
    motion: FramerMotion.motion,
    AnimatePresence: FramerMotion.AnimatePresence,
    MotionConfig: FramerMotion.MotionConfig,
    LayoutGroup: FramerMotion.LayoutGroup,
    Reorder: FramerMotion.Reorder,

    // Icons via helper
    icon,

    // Helpers / interaction
    __actions: opts.actions,
  }
}
