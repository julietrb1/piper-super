export type CruisePressureAltitudeHundreds = 0 | 20 | 40 | 60 | 80 | 90 | 100;

export type ClimbFigures = [number, number, number, number];

export const realClimbFigures: ClimbFigures[] = [
  [-15, 10, 2, 1.2],
  [-15, 20, 3, 1.6],
  [-15, 30, 5, 2],
  [-15, 40, 6, 2.2],
  [-15, 50, 8, 2.6],
  [-15, 60, 10, 3.1],
  [-15, 70, 13, 3.6],
  [-15, 80, 16, 4.1],
  [-15, 90, 19, 4.9],
  [-15, 100, 23, 5.6],
  [-15, 110, 28, 6.5],
  [-15, 120, 33, 7.8],
  [0, 10, 2, 1.3],
  [0, 20, 3, 1.7],
  [0, 30, 5, 2],
  [0, 40, 7, 2.4],
  [0, 50, 10, 3],
  [0, 60, 13, 3.6],
  [0, 70, 16, 4.2],
  [0, 80, 20, 5],
  [0, 90, 24, 5.9],
  [0, 100, 32, 7],
  [0, 110, 38, 8.5],
  [0, 120, 50, 11],
  [15, 10, 2, 1.4],
  [15, 20, 4, 1.8],
  [15, 30, 6, 2.2],
  [15, 40, 8, 2.8],
  [15, 50, 12, 3.4],
  [15, 60, 15, 4.1],
  [15, 70, 20, 5],
  [15, 80, 25, 6],
  [15, 90, 32, 7.5],
  [15, 100, 44, 9.7],
  [30, 10, 2, 1.5],
  [30, 20, 5, 2],
  [30, 30, 8, 2.4],
  [30, 40, 11, 3.1],
  [30, 50, 15, 4],
  [30, 60, 20, 5],
  [30, 70, 26, 6.2],
  [30, 80, 35, 8],
  [30, 90, 55, 11.8],
];

export interface IsaRow {
  isaDeviation: number;
  rpm: number;
}

export interface CruiseForAltitude {
  altHundreds: CruisePressureAltitudeHundreds;
  minTas: number;
  maxTas: number;
  isaRows: IsaRow[];
}

export interface CruisePerformance {
  altHundreds: CruisePressureAltitudeHundreds;
  rpm: number;
  tas: number;
}

export interface ClimbPerformance {
  minutes: number;
  fuelGal: number;
}
