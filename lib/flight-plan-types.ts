/**
 * Flight planning data types
 *
 * This module defines the data types used in the flight planning module.
 */

/**
 * A waypoint in a flight plan
 */
export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitudeFromHereFt: number | null;
  windTrueHeading_deg: number | null;
  temperature_C: number | null;
  isAirport: boolean;
  visitNoLand: boolean;
  groundTimeMin: number;
  refuelOptional: boolean;
}

/**
 * A routing variant (CTA or OCTA)
 */
export interface RouteVariant {
  id: string;
  name: string;
  type: 'CTA' | 'OCTA';
  waypoints: Waypoint[];
  ete: number | null; // Estimated time enroute (minutes)
  fuel: number | null; // Estimated fuel consumption (liters)
  topOfClimb: Array<{ index: number; altFt: number }> | null;
  topOfDescent: Array<{ index: number; altFt: number }> | null;
}

/**
 * A flight stage (e.g., "Stage 1", "Stage 2")
 */
export interface FlightStage {
  id: string;
  name: string;
  departureIcao: string;
  destinationIcao: string;
  variants: RouteVariant[];
}

/**
 * A complete flight plan
 */
export interface FlightPlan {
  id: string;
  name: string;
  aircraftId: string;
  stages: FlightStage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A scenario is a specific combination of route variants and refueling options
 */
export interface Scenario {
  id: string;
  name: string;
  stageVariants: Array<{
    stageId: string;
    variantId: string;
    variantType: 'CTA' | 'OCTA';
    refuel: boolean;
  }>;
  totalEte: number | null;
  totalFuel: number | null;
  fuelRemain: number | null;
  isValid: boolean;
}

/**
 * Airspace feature from GeoJSON
 */
export interface AirspaceFeature {
  id: string;
  name: string;
  type: string;
  icaoClass: string;
  upperLimit: {
    value: number;
    unit: string;
    referenceDatum: string;
  };
  lowerLimit: {
    value: number;
    unit: string;
    referenceDatum: string;
  };
  geometry: GeoJSON.Polygon;
}

/**
 * Airport feature from GeoJSON
 */
export interface AirportFeature {
  id: string;
  icaoCode: string;
  name: string;
  type: string;
  elevation: {
    value: number;
    unit: string;
    referenceDatum: string;
  };
  geometry: GeoJSON.Point;
}
