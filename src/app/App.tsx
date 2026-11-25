import { useEffect, useRef } from "react";
import { Alert, AppShell, type NavItem } from "../brand";
import { roleById, canSee, type ModuleId } from "../core/roles";
import { MODULES } from "../modules/registry";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { ModulePreview } from "../pages/ModulePreview";
import { MontageplanningPage } from "../modules/montageplanning/MontageplanningPage";
import { MontagePage } from "../modules/montage/MontagePage";
import { Gegevens } from "../pages/Gegevens";
import { Profiel } from "../pages/Profiel";
import { useSession } from "./session";
import { href, navigate, useRoute } from "./router";
import { isTestMode } from "../core/config";

export function App() {
  const { user, authReady } = useSession();
  const path = useRoute();
  const shellRef = useRef<HTMLDivElement>(null);

  // De avatar in de topbalk opent het profiel (ook met toetsenbord).
  useEffect(() => {
    const el = shellRef.current?.querySelector<HTMLElement>(".fx-avatar");
    if (!el) return;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", "Profiel en rol wisselen");
    const open = () => navigate("/profiel");
    const key = (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && open();
    el.addEventListener("click", open);
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("click", open);
      el.removeEventListener("keydown", key);
    };
  });

  if (!authReady) return null;
  if (!user) return <Login />;

  const role = roleById(user.role);
  const nav: NavItem[] = [
    { id: "/", label: "Overzicht", icon: "home", href: href("/"), tab: true, tabLabel: "Start" },
    { group: "Modules" },
    ...role.modules.map((id, i) => ({
      id: `/${id}`, label: MODULES[id].label, icon: MODULES[id].icon, href: href(`/${id}`), tab: i < 4, tabLabel: MODULES[id].tabLabel,
    })),
    ...(isTestMode ? [{ group: "Testomgeving" }, { id: "/gegevens", label: "Gegevens", icon: "file" as const, href: href("/gegevens"), tabLabel: "Gegevens" }] : []),
  ];

  const seg = path.split("/")[1] ?? "";
  let title: string | undefined;
  let eyebrow: string | undefined;
  let page;
  if (path === "/") {
    page = <Home />;
  } else if (seg in MODULES) {
    const id = seg as ModuleId;
    if (canSee(user.role, id)) {
      title = MODULES[id].label;
      eyebrow = "Module";
      page = id === "montageplanning" ? <MontageplanningPage /> : id === "montage" ? <MontagePage path={path} /> : <ModulePreview id={id} />;
      if (id === "montage") title = path.includes("/project/") ? "Orderinformatie" : path.includes("/uren") ? "Urenbriefje" : "Mijn week";
    } else {
      title = MODULES[id].label;
      page = <Alert tone="warning" title="Geen toegang">Deze module hoort niet bij de rol {role.label.toLowerCase()}. <a href="#/">Terug naar het overzicht</a>.</Alert>;
    }
  } else if (seg === "gegevens") {
    title = "Gegevens";
    eyebrow = "Testomgeving";
    page = <Gegevens />;
  } else if (seg === "profiel") {
    title = "Profiel";
    page = <Profiel />;
  } else {
    title = "Pagina niet gevonden";
    page = <Alert tone="info">Deze pagina bestaat niet. <a href="#/">Terug naar het overzicht</a>.</Alert>;
  }

  const active = seg in MODULES || seg === "gegevens" ? `/${seg}` : path === "/" ? "/" : undefined;

  return (
    <div ref={shellRef} className="app-frame">
      <AppShell nav={nav} active={active} user={avatarName(user.name)} title={title} eyebrow={eyebrow}>
        {page}
      </AppShell>
    </div>
  );
}

/** "Thijs van den Berg" -> "Thijs Berg", zodat de avatar "TB" toont. */
function avatarName(name: string) {
  const parts = name.split(" ");
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
}
