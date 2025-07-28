import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const T0 = 288.15; // ISA sea-level temperature (K)  – 15 °C
const L = 0.0019812; // Temperature lapse rate (K/ft) – 6.5 K/km
const gMR = 0.034163; // g·M / R for dry air (1/K)
const P0 = 101_325; // Sea-level pressure (Pa)
const R_SPEC = 287.058; // Specific gas constant for air (J·kg⁻¹·K⁻¹)

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

export function densityAltitudeISA(
  pressureAltitudeFt: number,
  isaDevC: number,
): number {
  /* 1. ISA temperature at the given pressure altitude (Kelvin) */
  const T_isa_K = T0 - L * pressureAltitudeFt;

  /* 2. Actual outside-air temperature (Kelvin) */
  const T_actual_K = T_isa_K + isaDevC;

  /* 3. Static pressure that defines this pressure altitude     */
  const theta = 1 - (L * pressureAltitudeFt) / T0; // dimensionless
  const n = gMR / L; // exponent ≈ 17.23
  const P = P0 * Math.pow(theta, n); // Pascals

  /* 4. Density ratio σ = ρ / ρ₀                              */
  const rho = P / (R_SPEC * T_actual_K);
  const rho0 = P0 / (R_SPEC * T0);
  const sigma = rho / rho0;

  /* 5. Convert σ back to density altitude                     */
  const exponent = 1 / (n - 1);
  const thetaRho = Math.pow(sigma, exponent); // = 1 − L·h/ T0
  return Math.round((T0 / L) * (1 - thetaRho)); // feet
}
