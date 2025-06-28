import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function roundOneDec(num: number) {
  return Math.round(num * 10) / 10;
}

export function lbsToKg(lbs: number) {
  return Math.round(lbs / 2.2046);
}
