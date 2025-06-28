import { CruiseForAltitude, CruisePerformance } from "@/lib/performance-models";
import { scaleLinear } from "d3-scale";

const cruises: CruiseForAltitude[] = [
  {
    altHundreds: 0,
    minTas: 100,
    maxTas: 106,
    isaRows: [
      { isaDeviation: -15, rpm: 2340 },
      { isaDeviation: 0, rpm: 2390 },
      { isaDeviation: 10, rpm: 2420 },
      { isaDeviation: 20, rpm: 2440 },
      { isaDeviation: 30, rpm: 2470 },
    ],
  },
  {
    altHundreds: 20,
    minTas: 103,
    maxTas: 108,
    isaRows: [
      { isaDeviation: -15, rpm: 2390 },
      { isaDeviation: 0, rpm: 2440 },
      { isaDeviation: 10, rpm: 2460 },
      { isaDeviation: 20, rpm: 2490 },
      { isaDeviation: 30, rpm: 2520 },
    ],
  },
  {
    altHundreds: 40,
    minTas: 105,
    maxTas: 111,
    isaRows: [
      {
        isaDeviation: -15,
        rpm: 2440,
      },
      { isaDeviation: 0, rpm: 2480 },
      { isaDeviation: 10, rpm: 2510 },
      { isaDeviation: 20, rpm: 2540 },
      { isaDeviation: 30, rpm: 2560 },
    ],
  },
  {
    altHundreds: 60,
    minTas: 107,
    maxTas: 113,
    isaRows: [
      {
        isaDeviation: -15,
        rpm: 2490,
      },
      { isaDeviation: 0, rpm: 2530 },
      { isaDeviation: 10, rpm: 2560 },
      { isaDeviation: 20, rpm: 2580 },
      { isaDeviation: 30, rpm: 2600 },
    ],
  },
  {
    altHundreds: 80,
    minTas: 109,
    maxTas: 114,
    isaRows: [
      {
        isaDeviation: -15,
        rpm: 2530,
      },
      { isaDeviation: 0, rpm: 2580 },
      { isaDeviation: 10, rpm: 2610 },
      { isaDeviation: 17.5, rpm: 2630 },
    ],
  },
  {
    altHundreds: 90,
    minTas: 110,
    maxTas: 114,
    isaRows: [
      {
        isaDeviation: -15,
        rpm: 2560,
      },
      { isaDeviation: 0, rpm: 2600 },
      { isaDeviation: 8.5, rpm: 2630 },
    ],
  },
  {
    altHundreds: 100,
    minTas: 112,
    maxTas: 112,
    isaRows: [
      {
        isaDeviation: -15,
        rpm: 2580,
      },
    ],
  },
];

const speedsDomain = [1600, 1800, 2000, 2200, 2440];

const vRRange = [40, 43, 46, 48, 52];
const calculateVRFromWeight = scaleLinear(speedsDomain, vRRange);

export function calcWarrior3VR(w: number) {
  return Math.round(calculateVRFromWeight(w));
}

const vRefRange = [49, 55, 60, 63, 65];
const calculateVRefFromWeight = scaleLinear(speedsDomain, vRefRange);

export function calcWarrior3VRef(w: number) {
  return Math.round(calculateVRefFromWeight(w));
}

const vTossRange = [44, 47, 50, 53, 57];
const calculateVTossFromWeight = scaleLinear(speedsDomain, vTossRange);

export function calcWarrior3VToss(w: number) {
  return Math.round(calculateVTossFromWeight(w));
}

export function calcWarrior3Cruise(
  altitudeHundreds: number,
  providedIsa: number
): CruisePerformance {
  const closestCruise = cruises.reduce(function(prev, curr) {
    return Math.abs(curr.altHundreds - altitudeHundreds) <=
      Math.abs(prev.altHundreds - altitudeHundreds)
      ? curr
      : prev;
  });

  const rpmDomain = closestCruise.isaRows.map(x => x.isaDeviation);
  const rpmRange = closestCruise.isaRows.map(x => x.rpm);
  const calculateRpmFromIsaDeviation = scaleLinear(rpmDomain, rpmRange);

  const tasDomain = [
    closestCruise.isaRows[0].isaDeviation,
    closestCruise.isaRows[closestCruise.isaRows.length - 1].isaDeviation,
  ];
  const tasRange = [closestCruise.minTas, closestCruise.maxTas];
  const calculateTasFromIsaDeviation = scaleLinear(tasDomain, tasRange);

  return {
    altHundreds: closestCruise.altHundreds,
    rpm: Math.round(calculateRpmFromIsaDeviation(providedIsa) / 10) * 10,
    tas: Math.round(calculateTasFromIsaDeviation(providedIsa)),
  };
}
