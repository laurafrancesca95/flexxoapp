// Kerncijfers op het startscherm, per rol, uit de Bemet-exports.
import type { ReactNode } from "react";
import type { AppUser } from "../core/auth";
import type { DataSnapshot } from "../core/data/repository";
import { num } from "./format";

export interface Stat {
  label: string;
  value: ReactNode;
  unit?: string;
  progress?: number;
  foot?: ReactNode;
}

const sum = (xs: (number | undefined)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);
const isoWeekEnd = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setHours(23, 59, 59, 999);
  d.setDate(d.getDate() + (6 - day));
  return d;
};

export function statsFor(user: AppUser, data: DataSnapshot): Stat[] {
  const { projecten, productieorders, verlofsaldo } = data.rows;
  const saldo = verlofsaldo.find((v) => v.personeelsnummer === user.personeelsnummer);
  const verlof: Stat | null = saldo
    ? { label: "Verlofsaldo", value: num(saldo.saldo), unit: "u", progress: Math.round((saldo.opgenomen / saldo.recht) * 100), foot: `${num(saldo.opgenomen)} van ${num(saldo.recht)} u opgenomen` }
    : null;
  const weekEnd = isoWeekEnd();
  const out: (Stat | null)[] = [];

  switch (user.role) {
    case "montageplanner":
    case "manager": {
      const montage = data.rows.montageprojecten;
      const urgent = montage.filter((p) => p.gewensteStart <= new Date(Date.now() + 14 * 864e5) && p.gewensteStart >= new Date(Date.now() - 7 * 864e5));
      out.push({ label: "Montageprojecten", value: montage.length, unit: "projecten", foot: `${urgent.length} met start rond de komende 2 weken` });
      out.push({ label: "VC-uren montage", value: num(sum(montage.map((p) => p.vcUrenWerk))), unit: "u", foot: `Plus ${num(sum(montage.map((p) => p.vcUrenReis)))} u reis` });
      out.push({ label: "In montage", value: projecten.filter((p) => p.status === "In montage").length, unit: "projecten" });
      if (user.role === "manager") {
        out.push({ label: "In productie", value: productieorders.filter((o) => o.status === "In productie").length, unit: "orders" });
      } else out.push(verlof);
      break;
    }
    case "monteur": {
      const actief = projecten.filter((p) => p.status === "In montage");
      out.push({ label: "In montage", value: actief.length, unit: "projecten", foot: "Bij jouw team komt hier je weekplanning" });
      out.push({ label: "Gepland", value: projecten.filter((p) => p.status === "Gepland").length, unit: "projecten" });
      out.push(verlof);
      break;
    }
    case "productie": {
      const tweeWeken = new Date(Date.now() + 14 * 864e5);
      const mijn = productieorders.filter((o) => o.werkplek === user.werkplek && ["Gepland", "In productie", "Afwijking"].includes(o.status) && (!o.start || o.start <= tweeWeken));
      out.push({ label: user.werkplek ?? "Werkplek", value: mijn.length, unit: "orders", foot: `Komende 2 weken · ${num(sum(mijn.map((o) => o.vcUren)))} VC-uren` });
      out.push({ label: "Afwijkingen", value: productieorders.filter((o) => o.status === "Afwijking").length, unit: "orders", foot: "In de hele productie" });
      out.push(verlof);
      break;
    }
    case "productieplanner": {
      const te = productieorders.filter((o) => o.status === "Te plannen");
      const inProd = productieorders.filter((o) => o.status === "In productie");
      out.push({ label: "In te plannen", value: te.length, unit: "orders", foot: `${num(sum(te.map((o) => o.vcUren)))} VC-uren` });
      out.push({ label: "In productie", value: inProd.length, unit: "orders" });
      out.push({ label: "Afwijkingen", value: productieorders.filter((o) => o.status === "Afwijking").length, unit: "orders" });
      out.push(verlof);
      break;
    }
    case "logistiek": {
      const gereed = projecten.filter((p) => p.status === "Gereed voor transport");
      const dezeWeek = projecten.filter((p) => p.leverdatum <= weekEnd && !["Gereed", "In montage"].includes(p.status));
      out.push({ label: "Gereed voor transport", value: gereed.length, unit: "projecten" });
      out.push({ label: "Levering deze week", value: dezeWeek.length, unit: "projecten" });
      out.push(verlof);
      break;
    }
    default:
      out.push(verlof);
  }
  return out.filter((s): s is Stat => !!s);
}
