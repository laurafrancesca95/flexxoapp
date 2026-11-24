// Rollen en welke modules elke rol ziet.
// Testfase: je kiest zelf een rol. Livegang: de rol komt uit Entra ID (app-rollen of groepen),
// zodat IT bepaalt wie welke modules ziet. Zie docs/architectuur.md.
import type { IconName } from "../brand";

export type RoleId =
  | "monteur"
  | "montageplanner"
  | "productie"
  | "productieplanner"
  | "logistiek"
  | "medewerker"
  | "manager";

export type ModuleId =
  | "montageplanning"
  | "montage"
  | "logistiek"
  | "productie"
  | "productieplanning"
  | "collega";

export interface RoleDef {
  id: RoleId;
  label: string;
  description: string;
  icon: IconName;
  /** Modules in volgorde van gebruik (meest gebruikt eerst). */
  modules: ModuleId[];
  /** Hoofdapparaat, bepaalt o.a. de standaarddichtheid. */
  device: "tablet" | "desktop" | "telefoon";
  /** Functies uit de medewerkersexport die bij deze rol horen (alleen testfase). */
  demoFuncties: string[];
}

export const ROLES: RoleDef[] = [
  { id: "monteur", label: "Monteur", description: "Weekplanning, klokken en formulieren op locatie", icon: "wrench", modules: ["montage", "collega"], device: "tablet", demoFuncties: ["Monteur", "Hoofdmonteur"] },
  { id: "montageplanner", label: "Montageplanner", description: "Projecten en monteurs inplannen", icon: "calendar", modules: ["montageplanning", "montage", "logistiek", "collega"], device: "desktop", demoFuncties: ["Montageplanner"] },
  { id: "productie", label: "Productiemedewerker", description: "Orders op je werkplek en de controlelijst", icon: "factory", modules: ["productie", "collega"], device: "tablet", demoFuncties: ["Lasser", "Samensteller", "Plaatwerker", "Spuiter", "Kwaliteitscontroleur"] },
  { id: "productieplanner", label: "Productieplanner", description: "Zes-weken-planning per werkplek", icon: "gantt", modules: ["productieplanning", "productie", "collega"], device: "desktop", demoFuncties: ["Productieplanner"] },
  { id: "logistiek", label: "Logistiek en magazijn", description: "Verzendlijsten, CMR en transport", icon: "truck", modules: ["logistiek", "collega"], device: "tablet", demoFuncties: ["Magazijnmedewerker", "Logistiek coördinator"] },
  { id: "medewerker", label: "Medewerker", description: "Verlof aanvragen en documenten", icon: "users", modules: ["collega"], device: "telefoon", demoFuncties: ["Engineer", "Calculator", "Administratief medewerker", "Projectleider"] },
  { id: "manager", label: "Manager", description: "Alle modules en verlof goedkeuren", icon: "home", modules: ["montageplanning", "productieplanning", "logistiek", "montage", "productie", "collega"], device: "desktop", demoFuncties: ["Manager montage", "Manager productie", "Directeur"] },
];

export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id)!;
export const canSee = (role: RoleId, module: ModuleId) => roleById(role).modules.includes(module);
