/**
 * Geometry utilities for flight planning
 *
 * This module provides geometry calculations for flight planning,
 * including distance, bearing, and magnetic track calculations.
 */

import { getMagVar } from './magvar';

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Calculate great circle distance between two points using Haversine formula
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in nautical miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate initial bearing (true track) from point 1 to point 2
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Initial bearing in degrees (0-360)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));

  // Normalize to 0-360 degrees
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Calculate the midpoint between two geographic coordinates
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Midpoint coordinates as [lat, lon]
 */
export function calculateMidpoint(lat1: number, lon1: number, lat2: number, lon2: number): [number, number] {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);

  const Bx = Math.cos(lat2Rad) * Math.cos(dLon);
  const By = Math.cos(lat2Rad) * Math.sin(dLon);

  const lat3Rad = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt((Math.cos(lat1Rad) + Bx) * (Math.cos(lat1Rad) + Bx) + By * By)
  );

  const lon3Rad = toRadians(lon1) + Math.atan2(By, Math.cos(lat1Rad) + Bx);

  return [toDegrees(lat3Rad), toDegrees(lon3Rad)];
}

/**
 * Leg metrics interface
 */
export interface LegMetrics {
  distanceNM: number;
  trueTrackDeg: number;
  magTrackDeg: number;
}

/**
 * Compute leg metrics between two waypoints
 * @param p1 First waypoint with lat/lon properties
 * @param p2 Second waypoint with lat/lon properties
 * @returns Leg metrics including distance, true track, and magnetic track
 */
export function computeLegMetrics(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): LegMetrics {
  // Calculate distance in nautical miles
  const distanceNM = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);

  // Calculate true track (initial bearing)
  const trueTrackDeg = calculateBearing(p1.lat, p1.lon, p2.lat, p2.lon);

  // Calculate midpoint for magnetic variation
  const [midLat, midLon] = calculateMidpoint(p1.lat, p1.lon, p2.lat, p2.lon);

  // Get magnetic variation at midpoint
  const magVarDeg = getMagVar(midLat, midLon);

  // Calculate magnetic track: magTrackDeg = (trueTrackDeg - magVarDeg + 360) % 360
  const magTrackDeg = (trueTrackDeg - magVarDeg + 360) % 360;

  return {
    distanceNM: Math.round(distanceNM * 10) / 10, // Round to 1 decimal place
    trueTrackDeg: Math.round(trueTrackDeg),       // Round to nearest degree
    magTrackDeg: Math.round(magTrackDeg)          // Round to nearest degree
  };
}

/**
 * Compute leg metrics for multiple waypoints
 * @param waypoints Array of waypoints with lat/lon properties
 * @returns Array of leg metrics for each segment
 */
export function computeAllLegMetrics(
  waypoints: Array<{ lat: number; lon: number }>
): LegMetrics[] {
  const legMetrics: LegMetrics[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const metrics = computeLegMetrics(waypoints[i], waypoints[i + 1]);
    legMetrics.push(metrics);
  }

  return legMetrics;
}

/**
 * Calculate total distance for a route
 * @param waypoints Array of waypoints with lat/lon properties
 * @returns Total distance in nautical miles
 */
export function calculateTotalDistance(waypoints: Array<{ lat: number; lon: number }>): number {
  const legMetrics = computeAllLegMetrics(waypoints);
  return legMetrics.reduce((total, leg) => total + leg.distanceNM, 0);
}
