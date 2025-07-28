import { cruiseLookup, CruiseRow } from "@/lib/o3-bilinear-cruise";

const cruiseRows: CruiseRow[] = [
  {
    pa: 0,
    isa: [-15, 0, +10, +20, +30],
    rpm: [2340, 2390, 2420, 2440, 2470],
    tasLo: 100,
    tasHi: 106,
  },
  {
    pa: 2000,
    isa: [-15, 0, +10, +20, +30],
    rpm: [2390, 2440, 2460, 2490, 2520],
    tasLo: 103,
    tasHi: 108,
  },
  {
    pa: 4000,
    isa: [-15, 0, +10, +20, +30],
    rpm: [2440, 2480, 2510, 2540, 2560],
    tasLo: 105,
    tasHi: 111,
  },
  {
    pa: 6000,
    isa: [-15, 0, +10, +20, +30],
    rpm: [2490, 2530, 2560, 2580, 2600],
    tasLo: 107,
    tasHi: 113,
  },
  {
    pa: 8000,
    isa: [-15, 0, +10, +17.5],
    rpm: [2530, 2580, 2610, 2630],
    tasLo: 109,
    tasHi: 114,
  },
  {
    pa: 9000,
    isa: [-15, 0, +8.5],
    rpm: [2560, 2600, 2630],
    tasLo: 110,
    tasHi: 114,
  },
  { pa: 10000, isa: [-15], rpm: [2580], tasLo: 112, tasHi: 112 },
];

export function getWarrior3Cruise(paFt: number, isaDevC: number) {
  return cruiseLookup(paFt, isaDevC, cruiseRows);
}
