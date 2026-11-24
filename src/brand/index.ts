// Getypte toegang tot de FlexxoApp-brandbookcomponenten (window.Flexxo).
// Bron: brandbook v1.1. Niet aanpassen; wijzig kleuren alleen in tokens.css.
import "./setup-react";
import "./bundle.js";
import "./tokens.css";
import "./bundle.css";
import type { ComponentType } from "react";
import type * as T from "./flexxo-types";

export type { IconName, NavItem, DataTableColumn } from "./flexxo-types";

interface FlexxoComponents {
  Wordmark: ComponentType<T.WordmarkProps>;
  Icon: ComponentType<T.IconProps>;
  Button: ComponentType<T.ButtonProps>;
  StatusBadge: ComponentType<T.StatusBadgeProps>;
  Card: ComponentType<T.CardProps>;
  ModuleTile: ComponentType<T.ModuleTileProps>;
  StatTile: ComponentType<T.StatTileProps>;
  Field: ComponentType<T.FieldProps>;
  Alert: ComponentType<T.AlertProps>;
  DataTable: <R>(p: T.DataTableProps<R>) => JSX.Element;
  CheckItem: ComponentType<T.CheckItemProps>;
  ActionBar: ComponentType<T.ActionBarProps>;
  PlanBoard: ComponentType<T.PlanBoardProps>;
  AppShell: ComponentType<T.AppShellProps>;
}

declare global {
  interface Window {
    Flexxo: FlexxoComponents;
  }
}

const F = window.Flexxo;
export const {
  Wordmark, Icon, Button, StatusBadge, Card, ModuleTile, StatTile, Field,
  Alert, DataTable, CheckItem, ActionBar, PlanBoard, AppShell,
} = F;
