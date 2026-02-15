import type { Unit } from "./types";

let cachedUnits: Unit[] | null = null;

export async function loadUnits(): Promise<Unit[]> {
  if (cachedUnits) return cachedUnits;
  const res = await fetch("/data.json");
  cachedUnits = (await res.json()) as Unit[];
  return cachedUnits;
}

export function getUnit(units: Unit[], id: number): Unit | undefined {
  return units.find((u) => u.unit_number === id);
}
