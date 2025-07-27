import { CubicSpline } from "@/lib/cubic-spline";

const fuelGalXs = [0, 20, 40, 60, 70, 80, 100, 110, 120, 130, 150, 160];
const fuelGalYs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const fuelGalSpline = new CubicSpline(fuelGalXs, fuelGalYs);

export const getClimbGal = (densityAltHundreds: number) =>
  fuelGalSpline.eval(densityAltHundreds);

export const getClimbL = (densityAltHundreds: number) =>
  getClimbGal(densityAltHundreds) * 3.8;

const minsXs = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
];
const minsYs = [0, 1, 2, 4, 5, 6, 8, 10, 12, 15, 18, 21, 24, 27.5, 32, 37, 45];
const minsSpline = new CubicSpline(minsXs, minsYs);

export const getClimbMin = (densityAltHundreds: number) =>
  minsSpline.eval(densityAltHundreds);
