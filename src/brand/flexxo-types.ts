import type { ReactNode, MouseEventHandler } from "react";

export type IconName = "home" | "calendar" | "wrench" | "truck" | "factory" | "gantt" | "users" | "search" | "bell" | "check" | "check-circle" | "alert" | "info" | "error" | "plus" | "clock" | "chevron-right" | "file" | "menu" | "send" | "filter";

/** Neutraal FlexxoApp-woordmerk: groen beeldmerk met dubbele chevron + "FlexxoApp". */
export interface WordmarkProps { /** Lettergrootte in px (standaard 22). */ size?: number; /** Alleen het beeldmerk (app-icoon, favicon). */ markOnly?: boolean; }
/** Lijn-icoon, 20px (of 28px met size="lg"), kleurt mee met `color`. */
export interface IconProps { name: IconName; size?: "md" | "lg"; /** Geef een label als het icoon zonder tekst betekenis draagt. */ label?: string; className?: string; }
/** Knop. Eén `primary` per scherm. */
export interface ButtonProps { variant?: "primary" | "secondary" | "quiet" | "danger"; size?: "sm" | "md" | "lg"; icon?: IconName; iconRight?: IconName; block?: boolean; /** Verplicht bij een knop met alleen een icoon. */ label?: string; disabled?: boolean; onClick?: MouseEventHandler; children?: ReactNode; type?: "button" | "submit"; }
/** Statuspil met stip + woord; kleur is nooit de enige drager van betekenis. */
export interface StatusBadgeProps { status?: "te-plannen" | "gepland" | "actief" | "in-productie" | "gereed" | "afwijking" | "concept" | "wacht" | "aangevraagd" | "akkoord" | "afgewezen" | "verzonden"; tone?: "neutral" | "info" | "success" | "warning" | "danger" | "active"; children?: ReactNode; }
/** Wit paneel met optionele titel, subtitel en actie rechtsboven. Met onClick wordt de hele kaart klikbaar. */
export interface CardProps { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; onClick?: MouseEventHandler; className?: string; children?: ReactNode; }
/** Tegel op het startscherm die een module opent. */
export interface ModuleTileProps { icon: IconName; name: string; meta?: string; /** Aantal open items, toont groene teller. */ count?: number; onClick?: MouseEventHandler; }
/** KPI-tegel voor dashboards. */
export interface StatTileProps { label: string; value: ReactNode; unit?: string; /** 0-100, toont voortgangsbalk. */ progress?: number; trend?: "up" | "down"; foot?: ReactNode; }
/** Label + invoerveld + hint/foutmelding. Zonder children rendert het zelf een input, select (options) of textarea (multiline). */
export interface FieldProps { id: string; label: string; hint?: string; error?: string; required?: boolean; disabled?: boolean; type?: string; inputMode?: string; options?: string[]; multiline?: boolean; placeholder?: string; defaultValue?: string; children?: ReactNode; }
/** Melding binnen de pagina. */
export interface AlertProps { tone?: "info" | "success" | "warning" | "danger"; title?: ReactNode; children?: ReactNode; }
export interface DataTableColumn<R> { key: string; label: string; numeric?: boolean; render?: (row: R) => ReactNode; mobileLabel?: boolean; }
/** Tabel die op mobiel (<640px) elke rij als kaart toont. */
export interface DataTableProps<R = any> { columns: DataTableColumn<R>[]; rows: R[]; onRowClick?: (row: R) => void; mobileCards?: boolean; caption?: string; /** "touch" (56px rijen, standaard) of "compact" (36px, alleen desktop). */ density?: "touch" | "compact"; }
/** Controlelijst-regel met grote OK / Afwijking / N.v.t.-knoppen (52px); bij Afwijking verschijnt een toelichtingsveld. */
export interface CheckItemProps { id: string; label: string; hint?: string; value?: "ok" | "nok" | "na" | null; defaultValue?: "ok" | "nok" | "na"; onChange?: (v: "ok" | "nok" | "na") => void; allowNA?: boolean; }
/** Vaste balk onderaan het scherm met de hoofdactie(s) binnen duimbereik. */
export interface ActionBarProps { info?: ReactNode; label?: string; children: ReactNode; }
export interface PlanBoardDay { label: string; today?: boolean; }
export interface PlanBoardRow { name: string; meta?: string; planned?: number; capacity?: number; }
export interface PlanBoardItem { row: number; start: number; span?: number; label: string; sub?: string; tone?: "gepland" | "info" | "warning" | "danger"; }
/** Planbord voor montage- en productieplanning: rijen = monteurs/teams/werkplekken, kolommen = dagen. Desktop-first; horizontaal scrollbaar op tablet. */
export interface PlanBoardProps { days: PlanBoardDay[]; rows: PlanBoardRow[]; items?: PlanBoardItem[]; rowLabel?: string; density?: "touch" | "compact"; label?: string; onItemClick?: (item: PlanBoardItem) => void; }
export interface NavItem { id?: string; label?: string; icon?: IconName; href?: string; group?: string; /** Ook tonen in de tabbar op telefoon (max 5). */ tab?: boolean; /** Korte naam voor tabbar en tabletrail (max 12 tekens). */ tabLabel?: string; }
/** App-frame: tabbar onderaan op telefoon (<640px), navigatierail op tablet (640-1279px), zijbalk op desktop (>=1280px). */
export interface AppShellProps { nav: NavItem[]; active?: string; user?: string; eyebrow?: string; title?: string; actions?: ReactNode; /** Een ActionBar die onderaan vast blijft staan. */ actionBar?: ReactNode; children?: ReactNode; }
