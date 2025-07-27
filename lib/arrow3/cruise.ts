import { CubicSpline } from "@/lib/cubic-spline";
import { roundOneDec } from "@/lib/utils";

export function calculateTas55(densityAlt: number) {
  return Math.min(131, Math.max(114, 114 + (17 / 13000) * densityAlt));
}

export function calculateTas65(densityAlt: number) {
  return Math.min(138, Math.max(124.5, 124.5 + (13.5 / 9800) * densityAlt));
}

export function calculateTas75(densityAlt: number) {
  return Math.min(144, Math.max(132, 132 + (12 / 6700) * densityAlt));
}

const mp55Power2200X = [0, 10, 20, 30, 40, 50, 60, 68, 70, 75, 80, 90, 94];
const mp55Power2200Y = [
  23.7, 23.4, 23.0, 22.6, 22.3, 21.9, 21.6, 21.3, 21.2, 21.0, 20.8, 20.5, 20.3,
];
const mp55Power2200Spline = new CubicSpline(mp55Power2200X, mp55Power2200Y);

export function calcMP55Power2200(pressAltHundreds: number) {
  try {
    return roundOneDec(mp55Power2200Spline.eval(pressAltHundreds));
  } catch {
    return null;
  }
}

const mp55Power2500X = [
  0, 10, 20, 30, 40, 50, 60, 68, 70, 75, 80, 90, 94, 100, 110, 120, 130, 140,
];
const mp55Power2500Y = [
  21.7, 21.4, 21.1, 20.8, 20.5, 20.2, 19.9, 19.7, 19.6, 19.4, 19.3, 19.0, 18.9,
  18.7, 18.4, 18.1, 17.8, 17.5,
];
const mp55Power2500Spline = new CubicSpline(mp55Power2500X, mp55Power2500Y);

export function calcMP55Power2500(pressAltHundreds: number) {
  try {
    return roundOneDec(mp55Power2500Spline.eval(pressAltHundreds));
  } catch {
    return null;
  }
}

const mp65Power2200X = [0, 10, 20, 30, 40, 50, 60, 68, 70];
const mp65Power2200Y = [26.1, 25.8, 25.4, 25.1, 24.7, 24.3, 24.0, 23.7, 23.6];
const mp65Power2200Spline = new CubicSpline(mp65Power2200X, mp65Power2200Y);

export function calcMP65Power2200(pressAltHundreds: number) {
  try {
    return roundOneDec(mp65Power2200Spline.eval(pressAltHundreds));
  } catch {
    return null;
  }
}

const mp65Power2500X = [0, 10, 20, 30, 40, 50, 60, 68, 70, 75, 80, 90];
const mp65Power2500Y = [
  24.1, 23.7, 23.4, 23.1, 22.8, 22.4, 22.1, 21.9, 21.8, 21.6, 21.5, 21.1,
];
const mp65Power2500Spline = new CubicSpline(mp65Power2500X, mp65Power2500Y);

export function calcMP65Power2500(pressAltHundreds: number) {
  try {
    return roundOneDec(mp65Power2500Spline.eval(pressAltHundreds));
  } catch {
    return null;
  }
}

const mp75Power2500X = [0, 10, 20, 30, 40, 50, 60];
const mp75Power2500Y = [26.3, 26.0, 25.6, 25.3, 24.9, 24.6, 24.3];
const mp75Power2500Spline = new CubicSpline(mp75Power2500X, mp75Power2500Y);

export function calcMP75Power2500(pressAltHundreds: number) {
  try {
    return roundOneDec(mp75Power2500Spline.eval(pressAltHundreds));
  } catch {
    return null;
  }
}
