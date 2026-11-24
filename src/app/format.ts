// Nederlandse notatie volgens het brandbook: 128,5 u · 1.250 kg · di 1 dec · 24-11-2026 · 08:42
const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
export const num = (n: number | undefined) => (n == null ? "–" : nf.format(n));
export const uren = (n: number | undefined) => (n == null ? "–" : `${nf.format(n)} u`);
export const datum = (d: Date | undefined) =>
  d ? d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";
export const dagKort = (d: Date | undefined) =>
  d ? d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "–";
export const peilmoment = (d: Date | undefined) =>
  d
    ? `${d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`
    : "onbekend";

/** Vandaag in de testfase. De dummy-data is rond deze datum gegenereerd. */
export const vandaag = () => new Date();
