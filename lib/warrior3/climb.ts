import { BilinearGrid, lookup } from "@/lib/o3-bilinear";

const climbMinGrid: BilinearGrid = {
  isa: [-15, 0, 15, 30],
  pa: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000],
  table: [
    [0, 0, 0, 0],
    [1.8, 2, 2.2, 2.4],
    [2.8, 3, 3.5, 5],
    [4.5, 5, 6, 7.5],
    [6, 7.25, 9, 10.5],
    [8, 10, 12, 15],
    [10.5, 12.5, 15.5, 20],
    [13, 15.5, 19.5, 22],
    [16, 19, 25.5, 35],
    [19, 24, 32.5, 53],
    [23, 29.5, 38, 53],
  ],
};

const fuelGalGrid: BilinearGrid = {
  isa: [-15, 0, 15, 30],
  pa: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000],
  table: [
    [1, 1, 1, 1],
    [1.2, 1.3, 1.4, 1.5],
    [1.6, 1.7, 1.8, 1.95],
    [1.9, 2, 2.15, 2.4],
    [2.2, 2.45, 2.8, 3.15],
    [2.6, 3, 3.45, 4],
    [3.1, 3.5, 4.05, 5],
    [3.7, 4.15, 5, 6.2],
    [4.1, 4.9, 6.1, 8],
    [4.85, 5.8, 7.5, 11.8],
    [5.6, 6.45, 8.6, 11.8],
  ],
};

export function getClimbMin(pressAltFt: number, isaDeviation: number) {
  return lookup(pressAltFt, isaDeviation, climbMinGrid);
}

export function getClimbFuelGal(pressAltFt: number, isaDeviation: number) {
  return lookup(pressAltFt, isaDeviation, fuelGalGrid);
}
