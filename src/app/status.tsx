import { StatusBadge } from "../brand";
import type { StatusBadgeProps } from "../brand/flexxo-types";

// Bemet-statussen naar brandbook-statusbadges (kleur + woord).
const MAP: Record<string, StatusBadgeProps> = {
  "te plannen": { status: "te-plannen" },
  gepland: { status: "gepland" },
  "in productie": { status: "in-productie" },
  "in montage": { status: "actief", children: "In montage" },
  "gereed voor transport": { tone: "info", children: "Gereed voor transport" },
  gereed: { status: "gereed" },
  afwijking: { status: "afwijking" },
};

export function Status({ value }: { value: string }) {
  const p = MAP[value.toLowerCase()] ?? { tone: "neutral", children: value };
  return <StatusBadge {...p} />;
}
