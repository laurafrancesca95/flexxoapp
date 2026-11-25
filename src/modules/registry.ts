// Alle modules van FlexxoApp. In de basis zijn het nog voorproeven; elke module wordt
// stap voor stap gebouwd in src/modules/<module>/.
import type { IconName } from "../brand";
import type { ExportId } from "../core/data/exports";
import type { ModuleId } from "../core/roles";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  /** Max 12 tekens, voor tabbar en rail. */
  tabLabel: string;
  icon: IconName;
  /** Eén regel op de moduletegel. */
  meta: string;
  intro: string;
  /** Wat deze module straks kan (uit het plan). */
  plannedFeatures: string[];
  /** Exports waarvan de module leest. */
  exports: ExportId[];
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  montageplanning: {
    id: "montageplanning",
    label: "Montageplanning",
    tabLabel: "Planning",
    icon: "calendar",
    meta: "Projecten en monteurs inplannen",
    intro: "De weekplanning per dag per monteur of team, op basis van de VC-uren uit Bemet. Vervangt de planning in Excel.",
    plannedFeatures: [
      "Dashboard met nog te plannen, gepland en open capaciteit bij monteurs",
      "Weekplanning per dag per monteur of team genereren",
      "Projecten plannen op VC-uren, met of zonder nacalculatie",
      "Equipment inplannen en aanvragen (kraan, hoogwerker, gereedschap)",
      "Bijzonderheden voor het team noteren, direct zichtbaar in hun weekplanning",
      "Meerwerk per project bijhouden en na gereed de calculatieopzet voor Bemet klaarzetten",
    ],
    exports: ["montageprojecten", "medewerkers", "calculatieregels"],
  },
  montage: {
    id: "montage",
    label: "Montage",
    tabLabel: "Montage",
    icon: "wrench",
    meta: "Weekplanning, klokken en formulieren",
    intro: "Alles wat een monteur op locatie nodig heeft: de eigen weekplanning, live klokken en de digitale formulieren.",
    plannedFeatures: [
      "Eigen weekplanning met de actieve order bovenaan",
      "Live klokken, vooringevuld vanuit de planning, te accorderen door de administratie",
      "Meerwerk direct vastleggen",
      "Formulieren: bouwdagrapport, opleveringsverklaring, gasdichtheidstestrapport en inmeetsheet",
      "Orderdata, tekeningen en paklijst uit de projectmap",
      "Montage-instructies per ordertype, in NL, DE en PL",
    ],
    exports: ["projecten", "calculatieregels"],
  },
  logistiek: {
    id: "logistiek",
    label: "Logistiek",
    tabLabel: "Logistiek",
    icon: "truck",
    meta: "Verzendlijsten, CMR en transport",
    intro: "Van projecten die klaar moeten staan tot een aangevraagd transport, met verzendlijst en CMR uit de app.",
    plannedFeatures: [
      "Dashboard met te versturen, transport inplannen en gereed voor transport",
      "Voorzet van de verzendlijst met geschatte afmeting en gewicht per colli",
      "Verzendlijst aanpassen door het magazijn en definitief maken",
      "CMR en exportdocumenten genereren en mailen om te printen",
      "Transport aanvragen bij verschillende aanbieders, met kostenadvies",
    ],
    exports: ["projecten", "calculatieregels"],
  },
  productie: {
    id: "productie",
    label: "Productie",
    tabLabel: "Productie",
    icon: "factory",
    meta: "Orders op je werkplek",
    intro: "De orders voor jouw werkplek in werkvolgorde, met de digitale controlelijst en directe meldingen bij afwijkingen.",
    plannedFeatures: [
      "Orders voor werkplek X in werkvolgorde",
      "Orderdata, tekeningen en specials uit de projectmap",
      "Digitale controlelijst met OK, Afwijking en N.v.t., en foto's van issues",
      "Afwijkingen automatisch gemeld aan engineering en kwaliteit",
      "Voortgang live bijhouden en gereedmelden voor Bemet",
      "Productie-instructies per ordertype, in NL, DE en PL",
    ],
    exports: ["productieorders", "projecten"],
  },
  productieplanning: {
    id: "productieplanning",
    label: "Productieplanning",
    tabLabel: "Prod.planning",
    icon: "gantt",
    meta: "Zes weken per werkplek",
    intro: "De productieplanning voor zes weken per dag per werkplek, op basis van de VC-uren. Vervangt de planning in Excel.",
    plannedFeatures: [
      "Dashboard met in te plannen en in productie",
      "Zes-weken-planning per dag per werkplek genereren",
      "Orders plannen op VC-uren uit Bemet",
      "Bijzonderheden voor productie noteren",
      "Directe koppeling met wat de werkplek ziet",
    ],
    exports: ["productieorders", "projecten", "medewerkers"],
  },
  collega: {
    id: "collega",
    label: "Collega",
    tabLabel: "Collega",
    icon: "users",
    meta: "Verlof en personeelsdocumenten",
    intro: "Je verlofsaldo, verlof aanvragen bij je manager en de personeels- en beleidsdocumenten op één plek.",
    plannedFeatures: [
      "Overzicht van je resterende verlofuren voor dit jaar",
      "Verlof aanvragen, je manager krijgt een melding om goed te keuren",
      "Na akkoord klaarzetten voor import in Bemet",
      "Personeels- en beleidsdocumenten, in NL, DE en PL",
    ],
    exports: ["verlofsaldo", "medewerkers"],
  },
};
