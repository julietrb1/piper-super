import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundOneDec(num: number) {
  return (Math.round(num * 10) / 10).toFixed(1);
}

export function lbsToKg(lbs: number) {
  return Math.round(lbs / 2.2046);
}

export function calculateTempFromIsa(
  pressAltHundreds: number,
  isaDeviation: number,
) {
  return 15 - pressAltHundreds / 5 + isaDeviation;
}

export function calcDensityAltitude(
  pressAltHundreds: number,
  isaDeviation: number,
) {
  return pressAltHundreds * 100 + isaDeviation * 120;
}
