/**
 * Aircraft performance calculations
 *
 * This module provides performance calculations for different aircraft types.
 * It exports an Aircraft interface with methods for climb rate, cruise fuel flow,
 * and true airspeed calculations, as well as a function to look up aircraft by ID.
 */

export interface Aircraft {
  id: string;
  name: string;
  climbRateFpm: (ISAdev: number, altFeet: number, weightKg: number) => number;
  cruiseFuelFlowLph: (OAT: number, pressureAltFt: number) => number;
  tasKt: (OAT: number, pressureAltFt: number) => number;
}

// Warrior III performance data
const warrior3: Aircraft = {
  id: "warrior3",
  name: "Piper Warrior III (PA-28-161)",

  climbRateFpm: (ISAdev: number, altFeet: number, weightKg: number) => {
    // Base climb rate at sea level, standard temperature, max gross weight
    const baseClimbRate = 700; // fpm

    // Adjustments for altitude, temperature, and weight
    const altitudeFactor = Math.max(0, 1 - altFeet / 15000); // Decrease with altitude
    const tempFactor = Math.max(0.7, 1 - ISAdev / 30); // Decrease with higher temperatures
    const weightFactor = Math.min(1.2, 2440 / (weightKg * 2.20462)); // Increase with lower weight

    return Math.round(baseClimbRate * altitudeFactor * tempFactor * weightFactor);
  },

  cruiseFuelFlowLph: (OAT: number, pressureAltFt: number) => {
    // Base fuel flow at 75% power
    const baseFuelFlow = 35; // L/hr

    // Adjustments for altitude and temperature
    const altitudeFactor = Math.max(0.9, 1 - pressureAltFt / 20000); // Slight decrease with altitude
    const tempFactor = Math.max(0.9, 1 + (OAT - 15) / 100); // Slight increase with higher temperatures

    return Math.round(baseFuelFlow * altitudeFactor * tempFactor);
  },

  tasKt: (OAT: number, pressureAltFt: number) => {
    // Base TAS at sea level, standard temperature
    const baseTAS = 110; // knots

    // Adjustments for altitude and temperature
    const altitudeFactor = 1 + pressureAltFt / 20000; // Increase with altitude
    const tempFactor = 1 + (OAT - 15) / 100; // Increase with higher temperatures

    return Math.round(baseTAS * altitudeFactor * tempFactor);
  }
};

// Arrow III performance data
const arrow3: Aircraft = {
  id: "arrow3",
  name: "Piper Arrow III (PA-28R-201)",

  climbRateFpm: (ISAdev: number, altFeet: number, weightKg: number) => {
    // Base climb rate at sea level, standard temperature, max gross weight
    const baseClimbRate = 850; // fpm

    // Adjustments for altitude, temperature, and weight
    const altitudeFactor = Math.max(0, 1 - altFeet / 18000); // Decrease with altitude
    const tempFactor = Math.max(0.7, 1 - ISAdev / 30); // Decrease with higher temperatures
    const weightFactor = Math.min(1.2, 2750 / (weightKg * 2.20462)); // Increase with lower weight

    return Math.round(baseClimbRate * altitudeFactor * tempFactor * weightFactor);
  },

  cruiseFuelFlowLph: (OAT: number, pressureAltFt: number) => {
    // Base fuel flow at 75% power
    const baseFuelFlow = 42; // L/hr

    // Adjustments for altitude and temperature
    const altitudeFactor = Math.max(0.9, 1 - pressureAltFt / 20000); // Slight decrease with altitude
    const tempFactor = Math.max(0.9, 1 + (OAT - 15) / 100); // Slight increase with higher temperatures

    return Math.round(baseFuelFlow * altitudeFactor * tempFactor);
  },

  tasKt: (OAT: number, pressureAltFt: number) => {
    // Base TAS at sea level, standard temperature
    const baseTAS = 130; // knots

    // Adjustments for altitude and temperature
    const altitudeFactor = 1 + pressureAltFt / 20000; // Increase with altitude
    const tempFactor = 1 + (OAT - 15) / 100; // Increase with higher temperatures

    return Math.round(baseTAS * altitudeFactor * tempFactor);
  }
};

// Map of aircraft by ID
const aircraftMap: Record<string, Aircraft> = {
  warrior3,
  arrow3
};

/**
 * Look up an aircraft by ID
 * @param id The aircraft ID
 * @returns The aircraft object
 * @throws Error if the aircraft ID is not found
 */
export function lookupAircraft(id: string): Aircraft {
  const aircraft = aircraftMap[id];
  if (!aircraft) {
    throw new Error(`Aircraft with ID ${id} not found`);
  }
  return aircraft;
}

/**
 * Compute the top of climb for a series of waypoints
 * @param waypoints Array of waypoints with altitude information
 * @param aircraft The aircraft to use for calculations
 * @param isaDev ISA deviation in degrees C
 * @returns Array of {index, altFt} objects indicating TOC points
 */
export function computeTopOfClimb(
  waypoints: Array<{ altitudeFromHereFt: number | null }>,
  aircraft: Aircraft,
  isaDev: number
): Array<{ index: number; altFt: number }> {
  const result: Array<{ index: number; altFt: number }> = [];
  let currentAlt = 0;

  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];

    // If this waypoint specifies a new altitude that's higher than current
    if (waypoint.altitudeFromHereFt && waypoint.altitudeFromHereFt > currentAlt) {
      // Calculate climb distance based on climb rate
      const altChange = waypoint.altitudeFromHereFt - currentAlt;
      const climbRate = aircraft.climbRateFpm(isaDev, currentAlt, 1000); // Assuming 1000kg for now

      // If we have a valid climb rate, add a TOC point
      if (climbRate > 0) {
        result.push({
          index: i,
          altFt: waypoint.altitudeFromHereFt
        });
      }

      currentAlt = waypoint.altitudeFromHereFt;
    }
  }

  return result;
}
